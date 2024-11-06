import React, {useState, useEffect} from 'react';
import {Dialog, DialogHeader, DialogBody, DialogFooter, Button, Input} from '@material-tailwind/react';

const MarkingEditModal = ({isOpen, onClose, marking, onSave, onDelete}) => {
    const [newMarking, setNewMarking] = useState('');
    const [newMarkingCounter, setNewMarkingCounter] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (marking) {
            setNewMarking(marking.marking);
            setNewMarkingCounter(marking.counter)
            setError('');
        }
    }, [marking]);

    const handleCheckboxChange = (marking) => {
        setNewMarkingCounter(marking)

    };

    const handleSave = async () => {
        if (marking) {
            try {
                await onSave(marking.id, newMarking, newMarkingCounter);
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

                <div className='mt-4 flex items-center gap-2' >
                    <label>Прилавка</label>
                    <input
                        type="checkbox"
                        className="before:content[''] peer relative h-5 w-5 cursor-pointer appearance-none rounded-md border border-blue-gray-200 transition-all before:absolute before:top-2/4 before:left-2/4 before:block before:h-12 before:w-12 before:-translate-y-2/4 before:-translate-x-2/4 before:rounded-full before:bg-blue-gray-500 before:opacity-0 before:transition-opacity checked:border-green-400 checked:bg-green-500 checked:before:bg-gray-900 hover:before:opacity-10"
                        // id={`checkbox-${marking.id}`}
                        checked={newMarkingCounter}
                        onChange={(e) => handleCheckboxChange(e.target.checked)}
                    />
                </div>
                {error && <div className="text-red-500 mt-2">{error}</div>}
            </DialogBody>
            <DialogFooter className="space-x-2">
                <Button className="bg-green-500" onClick={handleSave} disabled={!newMarking}>Сохранить</Button>
                <Button onClick={onClose}>Отмена</Button>
            </DialogFooter>
        </Dialog>
    );
};

export default MarkingEditModal;
