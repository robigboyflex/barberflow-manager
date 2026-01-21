import { motion } from "framer-motion";
import { Plus, Clock, DollarSign, Edit2, ToggleLeft, ToggleRight } from "lucide-react";
import { DuoCard, DuoIconButton, DuoBadge } from "@/components/ui/duo-components";
import AnimatedPage, { staggerContainer, fadeUpItem } from "@/components/AnimatedPage";
import useSound from "@/hooks/useSound";

const mockServices = [
  { id: "1", name: "Haircut", description: "Classic men's haircut", duration: 30, price: 25, active: true, popular: true },
  { id: "2", name: "Beard Trim", description: "Shape and trim", duration: 20, price: 15, active: true },
  { id: "3", name: "Haircut & Beard", description: "Full combo", duration: 45, price: 35, active: true, popular: true },
  { id: "4", name: "Hot Towel Shave", description: "Traditional shave", duration: 30, price: 30, active: true },
  { id: "5", name: "Kids Haircut", description: "Under 12 years", duration: 20, price: 18, active: true },
  { id: "6", name: "Hair Design", description: "Custom patterns", duration: 45, price: 40, active: false },
];

export default function CashierServices() {
  const { playSound } = useSound();

  const serviceEmojis: Record<string, string> = {
    'Haircut': '✂️',
    'Beard Trim': '🧔',
    'Haircut & Beard': '💈',
    'Hot Towel Shave': '🪒',
    'Kids Haircut': '👦',
    'Hair Design': '🎨',
  };

  return (
    <AnimatedPage>
      <div className="space-y-4">
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-2xl font-extrabold">💈 Services</h1>
          <DuoIconButton icon={Plus} variant="primary" size="sm" />
        </motion.div>

        {/* Summary */}
        <motion.div 
          className="grid grid-cols-2 gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <DuoCard className="text-center p-4">
            <p className="text-3xl font-extrabold text-primary">{mockServices.filter(s => s.active).length}</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </DuoCard>
          <DuoCard className="text-center p-4">
            <p className="text-3xl font-extrabold text-accent">${mockServices.reduce((a, s) => a + s.price, 0)}</p>
            <p className="text-sm text-muted-foreground">Menu Value</p>
          </DuoCard>
        </motion.div>

        {/* Services List */}
        <motion.div 
          className="space-y-3"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {mockServices.map((service) => (
            <motion.div key={service.id} variants={fadeUpItem}>
              <DuoCard className={`${!service.active ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-4">
                  {/* Emoji */}
                  <motion.div 
                    className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-2xl"
                    whileHover={{ scale: 1.1, rotate: 10 }}
                  >
                    {serviceEmojis[service.name] || '💇'}
                  </motion.div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg">{service.name}</h3>
                      {service.popular && <DuoBadge variant="warning">🔥 Popular</DuoBadge>}
                      {!service.active && <DuoBadge variant="default">Inactive</DuoBadge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1 text-sm">
                        <Clock className="w-4 h-4 text-info" />
                        {service.duration} min
                      </span>
                      <span className="flex items-center gap-1 text-sm font-bold text-primary">
                        <DollarSign className="w-4 h-4" />
                        {service.price}
                      </span>
                    </div>
                  </div>

                  {/* Toggle */}
                  <motion.button
                    className={`p-2 rounded-xl ${service.active ? 'text-primary' : 'text-muted-foreground'}`}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => playSound('tap')}
                  >
                    {service.active ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                  </motion.button>
                </div>
              </DuoCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </AnimatedPage>
  );
}
