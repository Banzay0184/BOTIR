import React from 'react';
import Sidebar from "./Sidebar.jsx";
import {Outlet} from "react-router-dom";

const Layout = ({currentUser, onLogout}) => {
    return (
        <div className="flex flex-col min-h-screen min-w-0">
            <Sidebar currentUser={currentUser} onLogout={onLogout}/>
            <main className="flex-1 w-full min-w-0 px-3 py-4 sm:px-4 md:px-6 overflow-auto">
                <Outlet/>
            </main>
        </div>
    );
};

export default Layout;
