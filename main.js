// main.js - Частина 1: Обробка аргументів та запуск сервера
const { program } = require('commander');
const http = require('http');
const fs = require('fs/promises'); // Використовуємо fs/promises для асинхронного читання
const path = require('path');
// const { XMLBuilder } = require('fast-xml-parser'); // Знадобиться у Частині 2

// Налаштування Commander.js
program
    // Обов'язкові аргументи
    .requiredOption('-i, --input <path>', 'шлях до файлу JSON для читання') [cite: 37, 41]
    .requiredOption('-h, --host <address>', 'адреса сервера (наприклад, localhost або 0.0.0.0)') [cite: 38, 41]
    .requiredOption('-p, --port <number>', 'порт сервера (наприклад, 3000)', parseInt) [cite: 39, 41]
    .parse(process.argv);

const options = program.opts();
const { input, host, port } = options;

// Перевірка існування вхідного файлу
const checkInputFile = async () => {
    try {
        await fs.access(input);
    } catch (error) {
        // Виведення помилки, якщо файл не знайдено [cite: 40]
        console.error(`Cannot find input file: ${input}`);
        process.exit(1);
    }
};

// Функція обробки HTTP-запитів
const requestListener = async (req, res) => {
    // Встановлення заголовків для коректної відповіді у Частині 2
    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    
    // Поки що повертаємо простий 200 OK
    res.writeHead(200);
    res.end('<response>Server is running</response>');
};

// Запуск сервера
const startServer = async () => {
    await checkInputFile(); // Перевіряємо файл перед запуском сервера

    const server = http.createServer(requestListener);
    
    // Передача хоста та порту у метод listen() 
    server.listen(port, host, () => {
        console.log(`Сервер запущено: http://${host}:${port}`);
        console.log(`Вхідний файл: ${path.resolve(input)}`);
    });

    // Обробка помилок сервера (наприклад, якщо порт вже зайнято)
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`Помилка: Адреса ${host}:${port} вже використовується.`);
        } else {
            console.error('Помилка сервера:', err.message);
        }
        process.exit(1);
    });
};

startServer();