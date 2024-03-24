import { FC } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { MainPage } from '@components/MainPage';
import { StatusPage } from '@components/StatusPage/StatusPage';

export const Router: FC = () => {
    const browserRouter = createBrowserRouter([
        { element: <MainPage />, children: [{ path: '/', element: <StatusPage /> }] },
    ]);
    return <RouterProvider router={browserRouter} />;
};
