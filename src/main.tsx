import { createRoot } from 'react-dom/client'
import './assets/styles/global.css'
import App from './App.tsx'
import {
  sweepAutoPostInstallmentPlans,
  sweepAutoPostRecurringRules,
} from "@/services/localStorage/finance-storage"

sweepAutoPostRecurringRules()
sweepAutoPostInstallmentPlans()

createRoot(document.getElementById('root')!).render(<App />)
