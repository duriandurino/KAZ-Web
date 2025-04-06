import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider, theme } from 'antd'
import './index.css'
import App from './App.tsx'

const { defaultAlgorithm } = theme;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        algorithm: [defaultAlgorithm],
        token: {
          colorPrimary: '#D4AF37',
          colorBgContainer: '#FFFFFF',
          colorBgElevated: '#FFFFFF',
          colorBgLayout: '#F5F5F5',
          colorText: '#2C1810',
          colorTextSecondary: '#3D2317',
          borderRadius: 6,
          colorBorder: '#D4AF37',
          colorPrimaryHover: '#3D2317',
          colorError: '#8B2E19',
          colorErrorHover: '#A13D26',
          colorLink: '#D4AF37',
        },
        components: {
          Layout: {
            headerBg: '#FFFFFF',
            siderBg: '#2C1810',
            headerColor: '#2C1810',
          },
          Menu: {
            darkItemBg: '#2C1810',
            darkItemSelectedBg: '#3D2317',
            darkItemHoverBg: '#3D2317',
            darkItemColor: '#FFFFFF',
            darkItemSelectedColor: '#D4AF37',
            darkItemHoverColor: '#D4AF37',
          },
          Button: {
            colorPrimary: '#D4AF37',
            defaultColor: '#2C1810',
            defaultBorderColor: '#D4AF37',
          },
          Card: {
            colorBgContainer: '#FFFFFF',
            colorBorderSecondary: '#D4AF37',
            colorText: '#2C1810',
            colorTextHeading: '#D4AF37',
          },
          Typography: {
            colorText: '#2C1810',
            colorTextSecondary: '#3D2317',
            colorTextHeading: '#D4AF37',
          },
          Input: {
            colorBgContainer: '#FFFFFF',
            colorBorder: '#D4AF37',
            colorText: '#2C1810',
            colorTextPlaceholder: '#8B7355',
          }
        },
      }}
    >
      <App />
    </ConfigProvider>
  </StrictMode>,
)
