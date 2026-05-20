import { FC } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { MainPage } from '@components/MainPage';
import { StatusPage } from '@components/StatusPage/StatusPage';
import { PlaygroundPage } from '@components/PlaygroundPage/PlaygroundPage';
import { CycleEditorPage } from '@components/CycleEditorPage/CycleEditorPage';
import { SchedulePage } from '@components/SchedulePage/SchedulePage';

export const Router: FC = () => {
    const browserRouter = createBrowserRouter([
        {
            element: <MainPage />,
            children: [
                { path: '/', element: <StatusPage /> },
                { path: '/cycles', element: <CycleEditorPage /> },
                { path: '/playground', element: <PlaygroundPage /> },
                { path: '/schedule', element: <SchedulePage /> },
            ],
        },
    ]);
    return <RouterProvider router={browserRouter} />;
};
