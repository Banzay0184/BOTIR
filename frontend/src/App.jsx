import React, {useState, useEffect} from "react";
import {Route, Routes, Navigate, useNavigate} from "react-router-dom";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import Layout from "./components/Layout.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import DocumentPage from "./pages/DocumentPage.jsx";
import IncomeList from "./components/IncomeList.jsx";
import OutcomeList from "./components/OutcomeList.jsx";
import IncomeDocument from "./components/IncomeDocument.jsx";
import OutcomeDocument from "./components/OutcomeDocument.jsx";
import ArchivePage from "./pages/ArchivePage.jsx";
import IncomeDocumentViewPage from "./pages/IncomeDocumentViewPage.jsx";
import OutcomeDocumentViewPage from "./pages/OutcomeDocumentViewPage.jsx";
import UsersPage from "./pages/UsersPage.jsx";
import ProductsPage from "./pages/ProductsPage.jsx";
import AuthService from './api/api.js';

function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const user = AuthService.getCurrentUser();
        if (user) {
            setCurrentUser(user);
        }
    }, []);

    const handleLogin = (user) => {
        setCurrentUser(user);
        navigate("/income");
    };

    const handleLogout = () => {
        AuthService.logout().then(() => {
            setCurrentUser(null);
            navigate("/"); // Перенаправление на страницу входа после выхода
        });
    };


    return (
        <Routes>
            {currentUser ? (
                <Route path="/" element={<Layout currentUser={currentUser} onLogout={handleLogout}/>}>
                    <Route index element={<Navigate to="/income" replace />} />
                    <Route path="/documents" element={<DocumentPage/>}/>
                    <Route path="/income" element={<IncomeList currentUser={currentUser}/>}/>
                    <Route path="/outcome" element={<OutcomeList/>}/>
                    <Route path="/incomedocument" element={<IncomeDocument currentUser={currentUser}/>}/>
                    <Route path="/incomedocument/:id" element={<IncomeDocumentViewPage/>}/>
                    <Route path="/outcomedocument" element={<OutcomeDocument currentUser={currentUser}/>}/>
                    <Route path="/outcomedocument/:id" element={<OutcomeDocumentViewPage/>}/>
                    <Route path="/archive" element={<ArchivePage/>}/>
                    <Route path="/products" element={<ProductsPage/>}/>
                    <Route path="/settings/users" element={<UsersPage/>}/>
                </Route>
            ) : (
                <Route path="/" element={<LoginPage onLogin={handleLogin}/>}/>
            )}
            <Route path="*" element={<NotFoundPage/>}/>
        </Routes>
    );
}

export default App;
