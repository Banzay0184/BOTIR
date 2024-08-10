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
    PresentationChartBarIcon,
    Cog6ToothIcon,
    InboxIcon,
    PowerIcon,
    DocumentChartBarIcon,
} from "@heroicons/react/24/solid";
import {ChevronRightIcon, ChevronDownIcon} from "@heroicons/react/24/outline";
import {Link} from "react-router-dom";

export default function Sidebar({currentUser, onLogout}) {
    const [isSidebarVisible, setIsSidebarVisible] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarVisible(!isSidebarVisible);
    };

    const [open, setOpen] = useState(0);

    const handleOpen = (value) => {
        setOpen(open === value ? 0 : value);
    };

    return (
        <div className=''>
            {!isSidebarVisible && (
                <button
                    onClick={toggleSidebar}
                    className="block top-4 left-4 z-50 p-2 bg-blue-500 text-white rounded-md lg:hidden"
                >
                    Open Sidebar
                </button>
            )}
            {isSidebarVisible && (
                <div
                    className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
                    onClick={toggleSidebar}
                />
            )}
            <Card
                className={`h-full min-h-screen fixed top-0 left-0 w-full max-w-[20rem] p-4 shadow-xl shadow-blue-gray-900/10 transition-transform duration-300 transform ${
                    isSidebarVisible ? 'translate-x-0' : '-translate-x-full'
                } lg:translate-x-0 lg:relative lg:flex z-50 `}
            >
                <div className="flex flex-col gap-2 items-center">
                    <Link to={'/home'} className="">
                        <Typography variant="h2" color="blue">
                            Warehouse
                        </Typography>
                    </Link>
                    <div className="flex flex-col items-center">
                        <Typography variant="h6" color="blue-gray">
                            {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Not logged in'}
                        </Typography>
                        <Typography variant="h6" color="blue">
                            {currentUser ? `${currentUser.position}` : 'Not logged in'}
                        </Typography>
                    </div>
                </div>
                <List>
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
                                <Link to={'/incomedocument'}>
                                    <ListItem>
                                        <ListItemPrefix>
                                            <ChevronRightIcon strokeWidth={3} className="h-3 w-5"/>
                                        </ListItemPrefix>
                                        Приход
                                    </ListItem>
                                </Link>
                                <Link to={'/outcomedocument'}>
                                    <ListItem>
                                        <ListItemPrefix>
                                            <ChevronRightIcon strokeWidth={3} className="h-3 w-5"/>
                                        </ListItemPrefix>
                                        Расход
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
                                <Link to={'/income'}>
                                    <ListItem>
                                        <ListItemPrefix>
                                            <ChevronRightIcon strokeWidth={3} className="h-3 w-5"/>
                                        </ListItemPrefix>
                                        Главный склад
                                    </ListItem>
                                </Link>
                                <Link to={'/outcome'}>
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
                    <ListItem>
                        <ListItemPrefix>
                            <Cog6ToothIcon className="h-5 w-5"/>
                        </ListItemPrefix>
                        Настройки
                    </ListItem>
                    <ListItem onClick={onLogout}>
                        <ListItemPrefix>
                            <PowerIcon className="h-5 w-5"/>
                        </ListItemPrefix>
                        Выйти
                    </ListItem>
                </List>
                {isSidebarVisible && (
                    <div
                        onClick={toggleSidebar}
                        className="fixed top-4 right-4 z-50 p-2 rounded-md lg:hidden"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}
                             stroke="currentColor" className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round"
                                  d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                        </svg>
                    </div>
                )}
            </Card>
        </div>
    );
}
