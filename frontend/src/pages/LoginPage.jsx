import React, {useState} from "react";
import {useNavigate} from "react-router-dom";
import {Card, CardHeader, CardBody, CardFooter, Input, Button, Typography, IconButton} from "@material-tailwind/react";
import AuthService from "../api/api.js";
import {EyeIcon} from "@heroicons/react/24/solid/index.js";

const LoginPage = ({onLogin}) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        AuthService.login(username, password).then(
            (response) => {
                onLogin(response);
                navigate("/home");
            },
            (error) => {
                const errorResponse = error.response.data;
                setErrors({
                    username: errorResponse.username ? "Некорректное имя пользователя." : null,
                    password: errorResponse.password ? "Некорректный пароль." : null,
                    detail: errorResponse.detail ? "Неправильные учетные данные." : "Ошибка входа в систему."
                });
            }
        );
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <Card className="w-full max-w-sm">
                <CardHeader
                    variant="gradient"
                    color="blue"
                    className="mb-4 grid h-28 place-items-center"
                >
                    <Typography variant="h3" color="white">
                        Вход
                    </Typography>
                </CardHeader>
                <CardBody className="flex flex-col gap-4">
                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                        <div>
                            <Input
                                type="text"
                                label="Имя пользователя"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                error={!!errors.username || !!errors.detail}
                            />
                            {errors.username && (
                                <Typography variant="small" color="red" className="mt-1">
                                    {errors.username}
                                </Typography>
                            )}
                        </div>
                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                label="Пароль"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                error={!!errors.password || !!errors.detail}
                            />
                            {errors.password && (
                                <Typography variant="small" color="red" className="mt-1">
                                    {errors.password}
                                </Typography>
                            )}
                            {errors.detail && !errors.password && !errors.username && (
                                <Typography variant="small" color="red" className="mt-1">
                                    {errors.detail}
                                </Typography>
                            )}
                        </div>
                        <Button type="submit" color="blue" fullWidth>
                            Войти
                        </Button>
                    </form>
                </CardBody>
                <CardFooter className="pt-0">
                    <Typography
                        variant="small"
                        color="gray"
                        className="text-center font-normal"
                    >
                        Нет аккаунта?{" "}
                        <a href="/register" className="font-medium text-blue-500 transition-colors hover:text-blue-700">
                            Зарегистрироваться
                        </a>
                    </Typography>
                </CardFooter>
            </Card>
        </div>
    );
};

export default LoginPage;
