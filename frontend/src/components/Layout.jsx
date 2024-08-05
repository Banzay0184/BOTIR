import React from 'react';
import Sidebar from "./Sidebar.jsx";
import {Outlet} from "react-router-dom";

const Layout = ({currentUser, onLogout}) => {
    return (
        <div className='flex flex-col lg:flex-row'>
            <Sidebar currentUser={currentUser} onLogout={onLogout}/>
            <div className="w-full px-4 py-4">
                <Outlet/>
            </div>
        </div>
    );
};

export default Layout;
