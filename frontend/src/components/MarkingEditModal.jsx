import React, { useState, useEffect } from 'react';
import { Dialog, DialogHeader, DialogBody, DialogFooter, Button, Input } from '@material-tailwind/react';

const MarkingEditModal = ({ isOpen, onClose, marking, onSave, onDelete }) => {
    const [newMarking, setNewMarking] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (marking) {
            setNewMarking(marking.marking);
            setError('');
        }
    }, [marking]);

    const handleSave = async () => {
        if (marking) {
            try {
                await onSave(marking.id, newMarking);
                onClose(); // Закрываем только если не было ошибок
            } catch (error) {
                if (error.response && error.response.data && error.response.data.marking) {
                    setError('Маркировка должна быть уникальной.');

                } else {
                    setError('Произошла ошибка при сохранении маркировки.');
                }
            }
        }
    };

    const handleDelete = async () => {
        if (marking) {
            try {
                await onDelete(marking.id);
                onClose(); // Закрываем только если не было ошибок
            } catch (error) {
                setError('Произошла ошибка при удалении маркировки.');
            }
        }
    };

    return (
        <Dialog open={isOpen} handler={onClose} onClose={onClose}>
            <DialogHeader>Изменить маркировку товара</DialogHeader>
            <DialogBody>
                <Input
                    autoFocus
                    label="Маркировка"
                    value={newMarking}
                    onChange={(e) => setNewMarking(e.target.value)}
                    error={!!error}
                />
                {error && <div className="text-red-500 mt-2">{error}</div>}
            </DialogBody>
            <DialogFooter className="space-x-2">
                <Button className="bg-green-500" onClick={handleSave} disabled={!newMarking}>Сохранить</Button>
                <Button color="red" onClick={handleDelete}>Удалить</Button>
                <Button onClick={onClose}>Отмена</Button>
            </DialogFooter>
        </Dialog>
    );
};

export default MarkingEditModal;
