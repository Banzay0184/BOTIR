import React from 'react';
import {
    Card,
    CardBody,
    CardHeader,
    Typography,
} from "@material-tailwind/react";
import {Square3Stack3DIcon} from "@heroicons/react/24/outline";
import IncomeChart from "../components/IncomeChart.jsx";
import OutcomeChart from "../components/OutcomeChart.jsx";

const HomePage = () => {
    return (
        <div className="grid grid-cols-2 gap-4">
            <Card className=''>
                <CardBody className="px-2 pb-0">
                    <IncomeChart/>
                </CardBody>
            </Card>
            <Card className=''>
                <CardBody className="px-2 pb-0">
                    <OutcomeChart/>
                </CardBody>
            </Card>
        </div>
    );
};

export default HomePage;
