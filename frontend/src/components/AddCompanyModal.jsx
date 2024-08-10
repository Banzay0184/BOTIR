import React, {useState} from 'react';
import {Dialog, DialogHeader, DialogBody, DialogFooter, Button, Input} from '@material-tailwind/react';
import {createCompany} from '../api/api'; // Проверьте путь к вашему API

const AddCompanyModal = ({isOpen, onClose, onAddCompany}) => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        inn: '',
    });

    const handleChange = (e) => {
        const {name, value} = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await createCompany(formData);
            onAddCompany(response.data);
            onClose();
        } catch (error) {
            console.error('Error adding company:', error.response?.data || error.message);
        }
    };

    return (
        <Dialog open={isOpen} handler={onClose}>
            <DialogHeader>Добавить новую компанию</DialogHeader>
            <DialogBody>
                <form onSubmit={handleSubmit} className="space-y-4">
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
