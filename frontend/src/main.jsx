import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'
import {ThemeProvider} from "@material-tailwind/react";
import {BrowserRouter} from 'react-router-dom'


ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <ThemeProvider>
                <App/>
                <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
            </ThemeProvider>
        </BrowserRouter>
    </React.StrictMode>,
)
