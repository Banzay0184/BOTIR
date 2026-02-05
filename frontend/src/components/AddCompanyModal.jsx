import React, {useState, useEffect} from 'react';
import {Dialog, DialogHeader, DialogBody, DialogFooter, Button, Input} from '@material-tailwind/react';
import {createCompany, getApiErrorMessage} from '../api/api';

const AddCompanyModal = ({isOpen, onClose, onAddCompany}) => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        inn: '',
    });
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) setError('');
    }, [isOpen]);

    const handleChange = (e) => {
        const {name, value} = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const response = await createCompany(formData);
            onAddCompany(response.data);
            onClose();
        } catch (err) {
            setError(getApiErrorMessage(err));
            console.error('Error adding company:', err.response?.data ?? err.message);
        }
    };

    return (
        <Dialog open={isOpen} handler={onClose}>
            <DialogHeader>Добавить новую компанию</DialogHeader>
            <DialogBody>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div className="mb-4">
                        <Input
                            type="text"
                            label="Название компании"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <Input
                            type="text"
                            label="Телефон компании"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <Input
                            type="text"
                            label="ИНН компании"
                            name="inn"
                            value={formData.inn}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <DialogFooter className='flex justify-between items-center space-x-2 '>
                        <Button
                            type="button"
                            color="red"
                            onClick={onClose}
                        >
                            Отмена
                        </Button>
                        <Button
                            type="submit"
                            color="green"
                        >
                            Сохранить
                        </Button>
                    </DialogFooter>
                </form>
            </DialogBody>
        </Dialog>
    );
};

export default AddCompanyModal;
