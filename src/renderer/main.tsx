/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

// Sentry must be initialized first
// Use electron-specific renderer package only inside Electron; fall back to the
// browser SDK when running as a standalone web server (no window.electronAPI).
if ((window as { electronAPI?: unknown }).electronAPI) {
  // Dynamic import avoids bundling sentry-ipc:// protocol code into the web build
  import('@sentry/electron/renderer').then((Sentry) => Sentry.init()).catch(() => {});
}

// Runtime patches must be imported early
import './utils/ui/runtimePatches';

// Browser adapter setup
import '@/common/adapter/browser';

// React and core dependencies
import type { PropsWithChildren } from 'react';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Alert } from '@arco-design/web-react';

// Context providers
import { AuthProvider } from './hooks/context/AuthContext';
import { ThemeProvider } from './hooks/context/ThemeContext';
import { PreviewProvider } from './pages/conversation/Preview/context/PreviewContext';
import { ConversationTabsProvider } from './pages/conversation/hooks/ConversationTabsContext';

// Arco Design
import { ConfigProvider } from '@arco-design/web-react';
// Configure Arco Design to use React 18's createRoot, fixing Message component's CopyReactDOM.render error
import '@arco-design/web-react/es/_util/react-19-adapter';
import '@arco-design/web-react/dist/css/arco.css';
import enUS from '@arco-design/web-react/es/locale/en-US';
import jaJP from '@arco-design/web-react/es/locale/ja-JP';
import zhCN from '@arco-design/web-react/es/locale/zh-CN';
import zhTW from '@arco-design/web-react/es/locale/zh-TW';
import koKR from '@arco-design/web-react/es/locale/ko-KR';
import { useTranslation } from 'react-i18next';

// Styles
import 'uno.css';
import './styles/arco-override.css';
import './styles/themes/index.css';

// i18n
import './services/i18n';
import { registerPwa } from './services/registerPwa';

// Components and utilities
import Layout from './components/layout/Layout';
import Router from './components/layout/Router';
import Sider from './components/layout/Sider';
import { useAuth } from './hooks/context/AuthContext';
import { ConversationHistoryProvider } from './hooks/context/ConversationHistoryContext';
import HOC from './utils/ui/HOC';

// Patch Korean locale with missing properties from English locale
const koKRComplete = {
  ...koKR,
  Calendar: {
    ...koKR.Calendar,
    monthFormat: enUS.Calendar.monthFormat,
    yearFormat: enUS.Calendar.yearFormat,
  },
  DatePicker: {
    ...koKR.DatePicker,
    Calendar: {
      ...koKR.DatePicker.Calendar,
      monthFormat: enUS.Calendar.monthFormat,
      yearFormat: enUS.Calendar.yearFormat,
    },
  },
  Form: enUS.Form,
  ColorPicker: enUS.ColorPicker,
};

const arcoLocales: Record<string, typeof enUS> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'ja-JP': jaJP,
  'ko-KR': koKRComplete,
  'en-US': enUS,
};

const AppProviders: React.FC<PropsWithChildren> = ({ children }) =>
  React.createElement(
    AuthProvider,
    null,
    React.createElement(
      ThemeProvider,
      null,
      React.createElement(PreviewProvider, null, React.createElement(ConversationTabsProvider, null, children))
    )
  );

type RootErrorBoundaryState = {
  error: Error | null;
};

class RootErrorBoundary extends React.Component<PropsWithChildren, RootErrorBoundaryState> {
  public state: RootErrorBoundaryState = {
    error: null,
  };

  public static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    return { error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[RendererRoot] Uncaught render error', error, errorInfo);
  }

  public render(): React.ReactNode {
    if (this.state.error) {
      return (
        <div className='flex min-h-screen items-center justify-center bg-bg-1 p-24px'>
          <div className='max-w-720px w-full'>
            <Alert
              type='error'
              title='Renderer crash'
              content={
                <div className='space-y-8px text-13px'>
                  <div>{this.state.error.message}</div>
                  <pre className='max-h-320px overflow-auto whitespace-pre-wrap rounded-8px bg-fill-2 p-12px text-12px text-t-secondary'>
                    {this.state.error.stack ?? 'No stack trace available'}
                  </pre>
                </div>
              }
            />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const Config: React.FC<PropsWithChildren> = ({ children }) => {
  const {
    i18n: { language },
  } = useTranslation();
  const arcoLocale = arcoLocales[language] ?? enUS;

  return React.createElement(ConfigProvider, { theme: { primaryColor: '#4E5969' }, locale: arcoLocale }, children);
};

const Main = () => {
  const { ready } = useAuth();

  if (!ready) {
    return null;
  }

  return (
    <Router
      layout={
        <ConversationHistoryProvider>
          <Layout sider={<Sider />} />
        </ConversationHistoryProvider>
      }
    />
  );
};

const App = HOC.Wrapper(Config)(Main);

void registerPwa();

const root = createRoot(document.getElementById('root')!);
root.render(
  React.createElement(AppProviders, null, React.createElement(RootErrorBoundary, null, React.createElement(App)))
);
