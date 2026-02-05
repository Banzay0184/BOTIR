import React from 'react';
import IncomeDocument from "../components/IncomeDocument.jsx";
import OutcomeDocument from "../components/OutcomeDocument.jsx";

const DocumentPage = () => {
    return (
        <div className="w-full min-w-0 h-full overflow-auto">
            <IncomeDocument/>
        </div>
    );
};

export default DocumentPage;