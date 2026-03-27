import { createRoot } from 'react-dom/client'
import './assets/styles/global.css'
import App from './App.tsx'
import { sweepAutoPostRecurringRules } from "@/services/localStorage/finance-storage"

sweepAutoPostRecurringRules()

createRoot(document.getElementById('root')!).render(<App />)
