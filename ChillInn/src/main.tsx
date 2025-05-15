import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider, theme } from 'antd'
import './index.css'
import App from './App.tsx'
import { SidebarProvider } from './components/SidebarContext.tsx'
import './utils/darkModeInit';

const { defaultAlgorithm, darkAlgorithm } = theme;

const isDarkMode = localStorage.getItem('darkMode') === 'true';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? [darkAlgorithm] : [defaultAlgorithm],
        token: {
          colorPrimary: '#D4AF37',
          colorBgContainer: isDarkMode ? '#1e1e1e' : '#FFFFFF',
          colorBgElevated: isDarkMode ? '#1e1e1e' : '#FFFFFF',
          colorBgLayout: isDarkMode ? '#121212' : '#F5F5F5',
          colorText: isDarkMode ? '#FFFFFF' : '#2C1810',
          colorTextSecondary: isDarkMode ? '#CCCCCC' : '#3D2317',
          borderRadius: 6,
          colorBorder: isDarkMode ? '#444444' : '#D9D9D9',
          colorPrimaryHover: '#3D2317',
          colorError: '#ff4d4f',
          colorErrorHover: '#ff7875',
          colorLink: '#D4AF37',
        },
        components: {
          Layout: {
            headerBg: isDarkMode ? '#1e1e1e' : '#FFFFFF',
            siderBg: isDarkMode ? '#000000' : '#2C1810',
            headerColor: isDarkMode ? '#FFFFFF' : '#2C1810',
          },
          Menu: {
            darkItemBg: isDarkMode ? '#000000' : '#2C1810',
            darkItemSelectedBg: isDarkMode ? '#1f1f1f' : '#3D2317',
            darkItemHoverBg: isDarkMode ? '#1f1f1f' : '#3D2317',
            darkItemColor: '#FFFFFF',
            darkItemSelectedColor: '#D4AF37',
            darkItemHoverColor: '#D4AF37',
          },
          Button: {
            colorPrimary: '#D4AF37',
            defaultColor: isDarkMode ? '#FFFFFF' : '#2C1810',
            defaultBorderColor: isDarkMode ? '#444444' : '#D4AF37',
          },
          Card: {
            colorBgContainer: isDarkMode ? '#1e1e1e' : '#FFFFFF',
            colorBorderSecondary: isDarkMode ? '#444444' : '#D4AF37',
            colorText: isDarkMode ? '#FFFFFF' : '#2C1810',
            colorTextHeading: isDarkMode ? '#FFFFFF' : '#D4AF37',
          },
          Typography: {
            colorText: isDarkMode ? '#FFFFFF' : '#2C1810',
            colorTextSecondary: isDarkMode ? '#CCCCCC' : '#3D2317',
            colorTextHeading: isDarkMode ? '#FFFFFF' : '#D4AF37',
          },
          Input: {
            colorBgContainer: isDarkMode ? '#1e1e1e' : '#FFFFFF',
            colorBorder: isDarkMode ? '#444444' : '#D9D9D9',
            colorText: isDarkMode ? '#FFFFFF' : '#2C1810',
            colorTextPlaceholder: isDarkMode ? '#888888' : '#8B7355',
          }
        },
      }}
    >
      <SidebarProvider>
    <App />
      </SidebarProvider>
    </ConfigProvider>
  </StrictMode>,
)
