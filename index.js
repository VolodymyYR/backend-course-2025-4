// index.js (Логіка для Варіанту 2: flights-1m.json)

const { Command } = require('commander');
const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const url = require('url');
const { XMLBuilder } = require('fast-xml-parser');

const program = new Command();

// Налаштування для fast-xml-parser
const xmlOptions = {
    ignoreAttributes: false,
    format: true,
    indentBy: "  ",
    arrayNodeName: "flight", // Кожен елемент масиву буде тегом <flight>
    rootName: "flights_data" // Кореневий елемент
};
const builder = new XMLBuilder(xmlOptions);

// Обробник запиту
async function requestHandler(req, res, inputFilePath) {
    try {
        const queryObject = url.parse(req.url, true).query;

        // 1. Читання JSON з файлу
        // Оскільки файл може бути великим, читаємо його асинхронно
        const data = await fs.readFile(inputFilePath, 'utf8');
        let records = JSON.parse(data);

        // 2. Аналіз та фільтрація вмісту відповідно до завдання (Варіант 2)

        // Фільтрація 1: ?carrier=XYZ
        const carrierCode = queryObject.carrier;
        if (carrierCode) {
            records = records.filter(item => item.CARRIER === carrierCode);
        }

        // Фільтрація 2: ?min_delay=X (використовуємо DEP_DELAY)
        const minDelay = parseInt(queryObject.min_delay);
        if (!isNaN(minDelay)) {
            // DEP_DELAY може бути null або undefined, тому перевіряємо його наявність
            records = records.filter(item => item.DEP_DELAY && item.DEP_DELAY > minDelay);
        }

        // Формування вихідних полів
        const filteredAndFormattedRecords = records.map(item => ({
            'FL_DATE': item.FL_DATE,
            'CARRIER': item.CARRIER,
            'FL_NUM': item.FL_NUM,
            'DEP_DELAY': item.DEP_DELAY,
            'CANCELED': item.CANCELED ? 'True' : 'False',
        }));

        // 3. Формування XML
        const xmlData = {
            [xmlOptions.rootName]: filteredAndFormattedRecords
        };
        const xmlOutput = builder.build(xmlData);

        // 4. Надсилання XML у відповідь
        res.writeHead(200, {
            'Content-Type': 'application/xml',
            'Content-Length': Buffer.byteLength(xmlOutput)
        });
        res.end(xmlOutput);

    } catch (error) {
        console.error('Error processing request:', error.message);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
    }
}


// Визначення командного рядка та запуск сервера (як у Частині 1)
program
  .requiredOption('-i, --input <path>', 'шлях до вхідного JSON файлу')
  .requiredOption('-h, --host <address>', 'адреса сервера')
  .requiredOption('-p, --port <number>', 'порт сервера', parseInt)
  .action(async (options) => {
    const { input, host, port } = options;
    const inputPath = path.resolve(input);

    // Перевірка наявності вхідного файлу
    try {
        await fs.access(inputPath);
    } catch (e) {
        // Помилка з Частини 1
        console.error('Cannot find input file');
        process.exit(1);
    }

    // Створення та запуск веб-сервера
    const server = http.createServer((req, res) => requestHandler(req, res, inputPath));

    server.listen(port, host, () => {
      console.log(`Server is running at http://${host}:${port}/`);
      console.log(`Input file: ${inputPath}`);
    });
  });

// Обробка обов'язкових параметрів
program.on('option:required', (option) => {
    console.error(`error: required option --${option[0]} not specified`);
    process.exit(1);
});

program.parse(process.argv);