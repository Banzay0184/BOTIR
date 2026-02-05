import React, {useState} from 'react';
import {
    Card,
    Typography,
    List,
    ListItem,
    ListItemPrefix,
    AccordionHeader,
    Accordion,
    AccordionBody,
} from "@material-tailwind/react";
import {
    Cog6ToothIcon,
    InboxIcon,
    PowerIcon,
    DocumentChartBarIcon,
} from "@heroicons/react/24/solid";
import {ChevronRightIcon, ChevronDownIcon} from "@heroicons/react/24/outline";
import {Link} from "react-router-dom";
import { isAdmin } from '../api/api';

const BurgerIcon = ({ open, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="p-2 rounded-lg text-blue-gray-700 hover:bg-blue-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 touch-target min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
    >
        <span className="sr-only">{open ? 'Закрыть меню' : 'Открыть меню'}</span>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
                <>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </>
            )}
        </svg>
    </button>
);

export default function Sidebar({currentUser, onLogout}) {
    const [isSidebarVisible, setIsSidebarVisible] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarVisible(!isSidebarVisible);
    };

    const closeSidebar = () => {
        setIsSidebarVisible(false);
    };

    const [open, setOpen] = useState(0);

    const handleOpen = (value) => {
        setOpen(open === value ? 0 : value);
    };

    return (
        <>
            {/* Шапка с бургером — всегда видна */}
            <header className="sticky top-0 z-30 flex items-center gap-3 h-14 min-h-[44px] pl-[max(0.75rem,env(safe-area-inset-left))] pr-4 bg-white border-b border-blue-gray-100 shadow-sm shrink-0">
                <BurgerIcon open={isSidebarVisible} onClick={toggleSidebar} />
                <Link to="/home" className="font-semibold text-xl text-blue-600 hover:text-blue-700">
                    Warehouse
                </Link>
            </header>

            {/* Оверлей при открытом меню */}
            {isSidebarVisible && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 transition-opacity"
                    onClick={closeSidebar}
                    aria-hidden="true"
                />
            )}

            {/* Выдвижная панель */}
            <Card
                className={`fixed top-0 left-0 h-full w-[min(20rem,100vw)] max-w-[20rem] p-4 shadow-xl shadow-blue-gray-900/10 transition-transform duration-300 ease-out z-50 pt-[max(1rem,env(safe-area-inset-top))] ${
                    isSidebarVisible ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex flex-col gap-2 items-center pt-2 pb-4 border-b border-blue-gray-100">
                    <Typography variant="h6" color="blue-gray">
                        {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Not logged in'}
                    </Typography>
                    <Typography variant="small" color="blue">
                        {currentUser ? (currentUser.position || '—') : '—'}
                    </Typography>
                </div>
                <List className="pt-2">
                    <Accordion
                        open={open === 2}
                        icon={
                            <ChevronDownIcon
                                strokeWidth={2.5}
                                className={`mx-auto h-4 w-4 transition-transform ${open === 2 ? "rotate-180" : ""}`}
                            />
                        }
                    >
                        <ListItem className="p-0" selected={open === 2}>
                            <AccordionHeader onClick={() => handleOpen(2)} className="border-b-0 p-3">
                                <ListItemPrefix>
                                    <DocumentChartBarIcon className="h-5 w-5"/>
                                </ListItemPrefix>
                                <Typography color="blue-gray" className="mr-auto font-normal">
                                    Документ
                                </Typography>
                            </AccordionHeader>
                        </ListItem>
                        <AccordionBody className="py-1">
                            <List className="p-0">
                                <Link to="/incomedocument" onClick={closeSidebar}>
                                    <ListItem>
                                        <ListItemPrefix>
                                            <ChevronRightIcon strokeWidth={3} className="h-3 w-5"/>
                                        </ListItemPrefix>
                                        Приход
                                    </ListItem>
                                </Link>
                                <Link to="/outcomedocument" onClick={closeSidebar}>
                                    <ListItem>
                                        <ListItemPrefix>
                                            <ChevronRightIcon strokeWidth={3} className="h-3 w-5"/>
                                        </ListItemPrefix>
                                        Расход
                                    </ListItem>
                                </Link>
                                <Link to="/archive" onClick={closeSidebar}>
                                    <ListItem>
                                        <ListItemPrefix>
                                            <ChevronRightIcon strokeWidth={3} className="h-3 w-5"/>
                                        </ListItemPrefix>
                                        Архив
                                    </ListItem>
                                </Link>
                            </List>
                        </AccordionBody>
                    </Accordion>
                    <Accordion
                        open={open === 1}
                        icon={
                            <ChevronDownIcon
                                strokeWidth={2.5}
                                className={`mx-auto h-4 w-4 transition-transform ${open === 1 ? "rotate-180" : ""}`}
                            />
                        }
                    >
                        <ListItem className="p-0" selected={open === 1}>
                            <AccordionHeader onClick={() => handleOpen(1)} className="border-b-0 p-3">
                                <ListItemPrefix>
                                    <InboxIcon className="h-5 w-5"/>
                                </ListItemPrefix>
                                <Typography color="blue-gray" className="mr-auto font-normal">
                                    Склад
                                </Typography>
                            </AccordionHeader>
                        </ListItem>
                        <AccordionBody className="py-1">
                            <List className="p-0">
                                <Link to="/income" onClick={closeSidebar}>
                                    <ListItem>
                                        <ListItemPrefix>
                                            <ChevronRightIcon strokeWidth={3} className="h-3 w-5"/>
                                        </ListItemPrefix>
                                        Главный склад
                                    </ListItem>
                                </Link>
                                <Link to="/outcome" onClick={closeSidebar}>
                                    <ListItem>
                                        <ListItemPrefix>
                                            <ChevronRightIcon strokeWidth={3} className="h-3 w-5"/>
                                        </ListItemPrefix>
                                        Информация по расходам
                                    </ListItem>
                                </Link>
                            </List>
                        </AccordionBody>
                    </Accordion>
                    {isAdmin() && (
                        <Accordion
                            open={open === 3}
                            icon={
                                <ChevronDownIcon
                                    strokeWidth={2.5}
                                    className={`mx-auto h-4 w-4 transition-transform ${open === 3 ? "rotate-180" : ""}`}
                                />
                            }
                        >
                            <ListItem className="p-0" selected={open === 3}>
                                <AccordionHeader onClick={() => handleOpen(3)} className="border-b-0 p-3">
                                    <ListItemPrefix>
                                        <Cog6ToothIcon className="h-5 w-5"/>
                                    </ListItemPrefix>
                                    <Typography color="blue-gray" className="mr-auto font-normal">
                                        Настройки
                                    </Typography>
                                </AccordionHeader>
                            </ListItem>
                            <AccordionBody className="py-1">
                                <List className="p-0">
                                    <Link to="/settings/users" onClick={closeSidebar}>
                                        <ListItem>
                                            <ListItemPrefix>
                                                <ChevronRightIcon strokeWidth={3} className="h-3 w-5"/>
                                            </ListItemPrefix>
                                            Пользователи
                                        </ListItem>
                                    </Link>
                                </List>
                            </AccordionBody>
                        </Accordion>
                    )}
                    <ListItem onClick={() => { onLogout(); closeSidebar(); }}>
                        <ListItemPrefix>
                            <PowerIcon className="h-5 w-5"/>
                        </ListItemPrefix>
                        Выйти
                    </ListItem>
                </List>
            </Card>
        </>
    );
}
