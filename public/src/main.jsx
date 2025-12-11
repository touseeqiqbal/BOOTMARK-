import React from 'react'
import ReactDOM from 'react-dom/client'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import App from './App'
import { CustomizationProvider } from './utils/CustomizationContext'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DndProvider backend={HTML5Backend}>
      <CustomizationProvider>
        <App />
      </CustomizationProvider>
    </DndProvider>
  </React.StrictMode>,
)
