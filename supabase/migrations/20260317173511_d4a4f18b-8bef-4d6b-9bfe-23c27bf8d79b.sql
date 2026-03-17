-- Enable realtime for shifts and activities tables
ALTER PUBLICATION supabase_realtime ADD TABLE shifts;
ALTER PUBLICATION supabase_realtime ADD TABLE activities;