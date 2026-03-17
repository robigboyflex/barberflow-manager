
-- Database function to auto clock-out stale shifts (called by cron/edge function)
CREATE OR REPLACE FUNCTION public.auto_clock_out_stale_shifts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_shift RECORD;
    v_staff RECORD;
    v_closed_count integer := 0;
    v_today date := CURRENT_DATE;
    v_transactions integer;
    v_revenue numeric;
    v_active_shifts integer;
BEGIN
    -- Find all shifts that are still open and were started before today (stale shifts)
    FOR v_shift IN
        SELECT s.id AS shift_id, s.staff_id, s.shop_id, s.clock_in
        FROM shifts s
        WHERE s.clock_out IS NULL
          AND COALESCE(s.is_closed, false) = false
          AND DATE(s.clock_in) < v_today
    LOOP
        -- Get staff info
        SELECT * INTO v_staff FROM staff WHERE id = v_shift.staff_id;
        
        IF v_staff IS NULL THEN
            CONTINUE;
        END IF;

        -- Calculate transactions/revenue for cashiers
        IF v_staff.role = 'cashier' THEN
            SELECT COUNT(*), COALESCE(SUM(price), 0)
            INTO v_transactions, v_revenue
            FROM cuts
            WHERE shop_id = v_shift.shop_id
              AND confirmed_by = v_shift.staff_id
              AND confirmed_at >= v_shift.clock_in
              AND status = 'confirmed';
        ELSE
            v_transactions := 0;
            v_revenue := 0;
        END IF;

        -- Close the shift with clock_out at 3:00 AM of today
        UPDATE shifts
        SET clock_out = v_today + interval '3 hours',
            is_closed = true,
            closed_at = now(),
            total_transactions = v_transactions,
            total_revenue = v_revenue
        WHERE id = v_shift.shift_id;

        -- Log auto clock-out activity
        PERFORM log_activity(
            v_shift.shop_id,
            v_shift.staff_id,
            v_staff.name,
            v_staff.role::text,
            'shift_closed',
            v_staff.name || ' was auto clocked out (forgot to clock out)',
            jsonb_build_object(
                'shift_id', v_shift.shift_id,
                'auto_clock_out', true,
                'transactions', v_transactions,
                'revenue', v_revenue
            )
        );

        -- Check if this closes the last shift for the previous day in this shop
        SELECT COUNT(*) INTO v_active_shifts
        FROM shifts
        WHERE shop_id = v_shift.shop_id
          AND DATE(clock_in) = DATE(v_shift.clock_in)
          AND (clock_out IS NULL OR is_closed = false);

        -- If no more active shifts for that day, lock the daily summary
        IF v_active_shifts = 0 THEN
            INSERT INTO daily_summaries (shop_id, summary_date, is_locked, locked_at)
            VALUES (v_shift.shop_id, DATE(v_shift.clock_in), true, now())
            ON CONFLICT (shop_id, summary_date) DO UPDATE
            SET is_locked = true, locked_at = now();

            UPDATE daily_summaries
            SET total_cuts = (
                    SELECT COUNT(*) FROM cuts
                    WHERE shop_id = v_shift.shop_id
                      AND DATE(created_at) = DATE(v_shift.clock_in)
                      AND status = 'confirmed'
                ),
                total_revenue = (
                    SELECT COALESCE(SUM(price), 0) FROM cuts
                    WHERE shop_id = v_shift.shop_id
                      AND DATE(created_at) = DATE(v_shift.clock_in)
                      AND status = 'confirmed'
                ),
                total_expenses = (
                    SELECT COALESCE(SUM(amount), 0) FROM expenses
                    WHERE shop_id = v_shift.shop_id
                      AND expense_date = DATE(v_shift.clock_in)
                ),
                net_profit = (
                    SELECT COALESCE(SUM(price), 0) FROM cuts
                    WHERE shop_id = v_shift.shop_id
                      AND DATE(created_at) = DATE(v_shift.clock_in)
                      AND status = 'confirmed'
                ) - (
                    SELECT COALESCE(SUM(amount), 0) FROM expenses
                    WHERE shop_id = v_shift.shop_id
                      AND expense_date = DATE(v_shift.clock_in)
                ),
                updated_at = now()
            WHERE shop_id = v_shift.shop_id AND summary_date = DATE(v_shift.clock_in);

            PERFORM log_activity(
                v_shift.shop_id,
                v_shift.staff_id,
                'System',
                'system',
                'day_closed',
                'Business day auto-closed after stale shift cleanup',
                jsonb_build_object('date', DATE(v_shift.clock_in), 'auto', true)
            );
        END IF;

        v_closed_count := v_closed_count + 1;
    END LOOP;

    RETURN jsonb_build_object('closed_shifts', v_closed_count, 'timestamp', now());
END;
$$;
