import React, {useState, useEffect} from 'react';
import {Navigate} from 'react-router-dom';
import {
    Card,
    Typography,
    Button,
    Dialog,
    DialogHeader,
    DialogBody,
    DialogFooter,
    Input,
    Select,
    Option,
} from '@material-tailwind/react';
import {
    getAdminUsers,
    getAdminRoles,
    createAdminUser,
    updateAdminUser,
    adminResetPassword,
    isAdmin,
} from '../api/api';

const ROLE_LABELS = {
    admin: 'Администратор',
    operator: 'Оператор',
    viewer: 'Просмотр',
};

const getRoleLabel = (name) => ROLE_LABELS[name] ?? name;

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [createForm, setCreateForm] = useState({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        position: '',
        groups: [],
    });
    const [editForm, setEditForm] = useState({
        first_name: '',
        last_name: '',
        phone: '',
        position: '',
        groups: [],
        is_active: true,
    });
    const [resetPasswordValue, setResetPasswordValue] = useState('');
    const [error, setError] = useState(null);

    const fetchUsers = async () => {
        try {
            const res = await getAdminUsers();
            const data = res.data?.results ?? res.data;
            setUsers(Array.isArray(data) ? data : []);
        } catch (e) {
            setError(e.response?.data?.detail ?? 'Ошибка загрузки пользователей');
        }
    };

    const fetchRoles = async () => {
        try {
            const res = await getAdminRoles();
            const data = res.data?.results ?? res.data;
            setRoles(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Failed to fetch roles', e);
        }
    };

    useEffect(() => {
        if (!isAdmin()) return;
        setLoading(true);
        Promise.all([fetchUsers(), fetchRoles()]).finally(() => setLoading(false));
    }, []);

    const handleOpenCreate = () => {
        setCreateForm({
            username: '',
            email: '',
            password: '',
            first_name: '',
            last_name: '',
            phone: '',
            position: '',
            groups: [],
        });
        setError(null);
        setCreateModalOpen(true);
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            const payload = {
                username: createForm.username,
                email: createForm.email,
                password: createForm.password,
                first_name: createForm.first_name,
                last_name: createForm.last_name,
                phone: createForm.phone || undefined,
                position: createForm.position || undefined,
            };
            const groupIds = roles.filter((r) => createForm.groups.includes(r.name)).map((r) => r.id);
            if (groupIds.length) payload.groups = groupIds;
            await createAdminUser(payload);
            setCreateModalOpen(false);
            fetchUsers();
        } catch (e) {
            setError(e.response?.data?.detail ?? e.response?.data ?? 'Ошибка создания');
        }
    };

    const handleOpenEdit = (user) => {
        setSelectedUser(user);
        setEditForm({
            first_name: user.first_name ?? '',
            last_name: user.last_name ?? '',
            phone: user.phone ?? '',
            position: user.position ?? '',
            groups: user.groups ?? [],
            is_active: user.is_active ?? true,
        });
        setError(null);
        setEditModalOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!selectedUser) return;
        setError(null);
        try {
            await updateAdminUser(selectedUser.id, {
                first_name: editForm.first_name,
                last_name: editForm.last_name,
                phone: editForm.phone || undefined,
                position: editForm.position || undefined,
                groups: roles.filter((r) => editForm.groups.includes(r.name)).map((r) => r.id),
                is_active: editForm.is_active,
            });
            setEditModalOpen(false);
            setSelectedUser(null);
            fetchUsers();
        } catch (e) {
            setError(e.response?.data?.detail ?? e.response?.data ?? 'Ошибка обновления');
        }
    };

    const handleDisable = async (user) => {
        if (!window.confirm(`Отключить пользователя ${user.username}?`)) return;
        try {
            await updateAdminUser(user.id, { is_active: false });
            fetchUsers();
        } catch (e) {
            setError(e.response?.data?.detail ?? 'Ошибка');
        }
    };

    const handleOpenResetPassword = (user) => {
        setSelectedUser(user);
        setResetPasswordValue('');
        setError(null);
        setResetPasswordModalOpen(true);
    };

    const handleResetPasswordSubmit = async (e) => {
        e.preventDefault();
        if (!selectedUser || !resetPasswordValue.trim()) return;
        setError(null);
        try {
            await adminResetPassword(selectedUser.id, resetPasswordValue);
            setResetPasswordModalOpen(false);
            setSelectedUser(null);
        } catch (e) {
            setError(e.response?.data?.detail ?? e.response?.data ?? 'Ошибка сброса пароля');
        }
    };

    if (!isAdmin()) {
        return <Navigate to="/home" replace />;
    }

    if (loading) {
        return (
            <div className="p-4 flex justify-center items-center min-h-[200px]">
                <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12" />
            </div>
        );
    }

    return (
        <div className="p-3 sm:p-4 w-full min-w-0">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                <Typography variant="h4" className="text-xl sm:text-2xl">Пользователи</Typography>
                <Button color="blue" onClick={handleOpenCreate} className="w-full sm:w-auto shrink-0">
                    Создать пользователя
                </Button>
            </div>
            {error && (
                <div className="mb-4 p-2 bg-red-100 text-red-800 rounded text-sm" role="alert">
                    {Array.isArray(error) ? error.join(', ') : JSON.stringify(error)}
                </div>
            )}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto -mx-2 sm:mx-0">
                <table className="w-full min-w-[520px] table-auto text-left">
                    <thead>
                        <tr className="border-b border-blue-gray-100 bg-blue-gray-50">
                            <th className="p-4">Имя / Логин</th>
                            <th className="p-4">Должность</th>
                            <th className="p-4">Роль</th>
                            <th className="p-4">Статус</th>
                            <th className="p-4">Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id} className="border-b border-blue-gray-50">
                                <td className="p-4">
                                    <Typography variant="small">
                                        {[user.first_name, user.last_name].filter(Boolean).join(' ') || '—'}
                                    </Typography>
                                    <Typography variant="small" color="gray">
                                        {user.username}
                                    </Typography>
                                </td>
                                <td className="p-4">{user.position || '—'}</td>
                                <td className="p-4">
                                    {(user.groups && user.groups[0]) ? getRoleLabel(user.groups[0]) : '—'}
                                </td>
                                <td className="p-4">{user.is_active ? 'Активен' : 'Отключён'}</td>
                                <td className="p-4 flex gap-2 flex-wrap">
                                    <Button size="sm" color="blue" onClick={() => handleOpenEdit(user)}>
                                        Редактировать
                                    </Button>
                                    {user.is_active && (
                                        <Button size="sm" color="orange" onClick={() => handleDisable(user)}>
                                            Отключить
                                        </Button>
                                    )}
                                    <Button size="sm" color="green" onClick={() => handleOpenResetPassword(user)}>
                                        Сбросить пароль
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </Card>

            {/* Create user modal */}
            <Dialog open={createModalOpen} handler={() => setCreateModalOpen(false)} size="md">
                <DialogHeader>Создать пользователя</DialogHeader>
                <DialogBody>
                    <form id="create-user-form" onSubmit={handleCreateSubmit} className="space-y-4">
                        <Input
                            label="Логин"
                            value={createForm.username}
                            onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
                            required
                        />
                        <Input
                            type="email"
                            label="Email"
                            value={createForm.email}
                            onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                        />
                        <Input
                            type="password"
                            label="Пароль"
                            value={createForm.password}
                            onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                            required
                        />
                        <Input
                            label="Имя"
                            value={createForm.first_name}
                            onChange={(e) => setCreateForm((f) => ({ ...f, first_name: e.target.value }))}
                        />
                        <Input
                            label="Фамилия"
                            value={createForm.last_name}
                            onChange={(e) => setCreateForm((f) => ({ ...f, last_name: e.target.value }))}
                        />
                        <Input
                            label="Телефон"
                            value={createForm.phone}
                            onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                        />
                        <Input
                            label="Должность"
                            value={createForm.position}
                            onChange={(e) => setCreateForm((f) => ({ ...f, position: e.target.value }))}
                        />
                        <div>
                            <Typography variant="small" className="mb-1 block">Роль</Typography>
                            <Select
                                label="Роль"
                                value={createForm.groups[0] ?? ''}
                                onChange={(val) => setCreateForm((f) => ({ ...f, groups: val ? [val] : [] }))}
                            >
                                {roles.map((r) => (
                                    <Option key={r.id} value={r.name}>
                                        {getRoleLabel(r.name)}
                                    </Option>
                                ))}
                            </Select>
                        </div>
                    </form>
                </DialogBody>
                <DialogFooter>
                    <Button variant="outlined" color="red" onClick={() => setCreateModalOpen(false)}>
                        Отмена
                    </Button>
                    <Button type="submit" form="create-user-form" color="green">
                        Создать
                    </Button>
                </DialogFooter>
            </Dialog>

            {/* Edit user modal */}
            <Dialog open={editModalOpen} handler={() => setEditModalOpen(false)} size="md">
                <DialogHeader>Редактировать пользователя</DialogHeader>
                <DialogBody>
                    <form id="edit-user-form" onSubmit={handleEditSubmit} className="space-y-4">
                        <Input
                            label="Имя"
                            value={editForm.first_name}
                            onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))}
                        />
                        <Input
                            label="Фамилия"
                            value={editForm.last_name}
                            onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))}
                        />
                        <Input
                            label="Телефон"
                            value={editForm.phone}
                            onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                        />
                        <Input
                            label="Должность"
                            value={editForm.position}
                            onChange={(e) => setEditForm((f) => ({ ...f, position: e.target.value }))}
                        />
                        <div>
                            <Typography variant="small" className="mb-1 block">Роль</Typography>
                            <Select
                                label="Роль"
                                value={editForm.groups[0] ?? ''}
                                onChange={(val) => setEditForm((f) => ({ ...f, groups: val ? [val] : [] }))}
                            >
                                {roles.map((r) => (
                                    <Option key={r.id} value={r.name}>
                                        {getRoleLabel(r.name)}
                                    </Option>
                                ))}
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="edit-is-active"
                                checked={editForm.is_active}
                                onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.checked }))}
                                className="rounded"
                            />
                            <label htmlFor="edit-is-active">Активен</label>
                        </div>
                    </form>
                </DialogBody>
                <DialogFooter>
                    <Button variant="outlined" color="red" onClick={() => setEditModalOpen(false)}>
                        Отмена
                    </Button>
                    <Button type="submit" form="edit-user-form" color="green">
                        Сохранить
                    </Button>
                </DialogFooter>
            </Dialog>

            {/* Reset password modal */}
            <Dialog open={resetPasswordModalOpen} handler={() => setResetPasswordModalOpen(false)}>
                <DialogHeader>Сбросить пароль {selectedUser?.username}</DialogHeader>
                <DialogBody>
                    <form id="reset-password-form" onSubmit={handleResetPasswordSubmit} className="space-y-4">
                        <Input
                            type="password"
                            label="Новый пароль"
                            value={resetPasswordValue}
                            onChange={(e) => setResetPasswordValue(e.target.value)}
                            required
                        />
                    </form>
                </DialogBody>
                <DialogFooter>
                    <Button variant="outlined" color="red" onClick={() => setResetPasswordModalOpen(false)}>
                        Отмена
                    </Button>
                    <Button type="submit" form="reset-password-form" color="green">
                        Сбросить
                    </Button>
                </DialogFooter>
            </Dialog>
        </div>
    );
}
