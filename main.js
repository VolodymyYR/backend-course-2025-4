// main.js - ФІНАЛЬНИЙ РОБОЧИЙ КОД (виправлення XML-структури)

const { program } = require('commander');
const http = require('http'); 
const fs = require('fs/promises'); 
const path = require('path');
const url = require('url'); 
const { XMLBuilder } = require('fast-xml-parser');

// Налаштування Commander.js
program
    .requiredOption('-i, --input <path>', 'шлях до файлу JSON для читання')
    .requiredOption('-h, --host <address>', 'адреса сервера')
    .requiredOption('-p, --port <number>', 'порт сервера', parseInt)
    .parse(process.argv);

const options = program.opts();
const { input, host, port } = options;

// Об'єкт для налаштування fast-xml-parser
const builderOptions = {
    ignoreAttributes: false,
    format: true,
};
const builder = new XMLBuilder(builderOptions);

// Асинхронна функція для перевірки існування вхідного файлу
const checkInputFile = async () => {
    try {
        await fs.access(input);
    } catch (error) {
        console.error("Cannot find input file");
        process.exit(1);
    }
};

// Асинхронна функція для читання файлу
const readFlightsData = async (filePath) => {
    try {
        const data = await fs.readFile(filePath, 'utf-8'); 
        const lines = data.split('\n').filter(line => line.trim() !== '');

        return lines.map(line => {
            try {
                return JSON.parse(line);
            } catch (e) {
                return null;
            }
        }).filter(item => item !== null);

    } catch (e) {
        console.error('Помилка читання або парсингу JSON:', e.message);
        return [];
    }
};

// Функція обробки HTTP-запитів
const requestListener = async (req, res) => {
    res.setHeader('Content-Type', 'text/xml; charset=utf-8');

    try {
        const flights = await readFlightsData(input);
        const query = url.parse(req.url, true).query;
        
        const dateParam = query.date === 'true'; 
        const airtimeMinParam = parseFloat(query.airtime_min); 

        let filteredFlights = flights; 

        // Фільтрація за airtime_min
        if (!isNaN(airtimeMinParam)) {
            filteredFlights = filteredFlights.filter(flight => 
                parseFloat(flight.AIR_TIME) > airtimeMinParam
            );
        }

        // 💡 ВИПРАВЛЕННЯ: Створення елементів XML (тепер це чисті об'єкти)
        const xmlDataItems = filteredFlights.map(flight => {
            const output = {
                air_time: flight.AIR_TIME,
                distance: flight.DISTANCE,
            };
            
            if (dateParam) {
                output.date = flight.FL_DATE;
            }

            return output; 
        });
        
        // 💡 ФІНАЛЬНЕ ВИПРАВЛЕННЯ: Примусове обгортання масиву для гарантії єдиного кореня
        const xmlObject = {
            flights: {
                flight: xmlDataItems
            }
        };
        
        // Формування XML
        let xmlContent = builder.build(xmlObject);
        xmlContent = xmlContent.trim(); 

        // Надсилання відповіді
        res.writeHead(200);
        res.end(xmlContent);

    } catch (e) {
        console.error('Помилка обробки запиту:', e);
        res.writeHead(500);
        res.end(`<error>Internal Server Error: ${e.message}</error>`);
    }
};

// Запуск сервера
const startServer = async () => {
    await checkInputFile(); 

    const server = http.createServer(requestListener);
    
    server.listen(port, host, () => {
        console.log(`Сервер запущено: http://${host}:${port}`);
        console.log(`Вхідний файл: ${path.resolve(input)}`);
    });

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