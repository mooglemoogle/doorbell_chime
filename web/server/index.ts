import express, { json } from 'express';
import cors from 'cors';
import { StatusCodes } from 'http-status-codes';
import { config } from 'dotenv';

config();

import routes from '@app/routes/index';

const app = express();

app.use(
    json(),
    cors({
        origin: process.env.CLIENT_URL,
        optionsSuccessStatus: StatusCodes.OK,
    })
);

app.use(routes());

app.use('*', (req, res) => {
    res.status(StatusCodes.NOT_FOUND).send('404 Not Found');
});

app.listen(process.env.APP_PORT, () => {
    console.log(`Light Control listening on port ${process.env.APP_PORT}`);
});
