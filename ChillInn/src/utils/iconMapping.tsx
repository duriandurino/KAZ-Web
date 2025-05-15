import React from 'react';
import {
  WifiOutlined,
  CoffeeOutlined,
  DesktopOutlined,
  ThunderboltOutlined,
  CarOutlined,
  SafetyOutlined,
  HeartOutlined,
  HomeOutlined,
  EnvironmentOutlined,
  CompassOutlined,
  AppstoreOutlined,
  FireOutlined,
  GlobalOutlined,
  TrophyOutlined,
  RocketOutlined,
  StarOutlined,
  ShopOutlined,
  ShoppingOutlined,
  SkinOutlined,
  SoundOutlined,
  CustomerServiceOutlined,
  TeamOutlined,
  ToolOutlined,
  TruckOutlined,
  WalletOutlined,
  LaptopOutlined,
  PictureOutlined,
  GiftOutlined,
  NotificationOutlined,
  PhoneOutlined,
  RobotOutlined,
  SmileOutlined,
  TrophyFilled,
  FormatPainterOutlined,
  BulbOutlined,
  SettingOutlined,
  LikeOutlined,
  MenuOutlined,
  MailOutlined,
  BellOutlined,
  PlusOutlined,
  ControlOutlined,
} from '@ant-design/icons';

/**
 * Map of icon names to their corresponding React components
 */
export const iconMap: Record<string, React.ReactNode> = {
  'wifi': <WifiOutlined />,
  'coffee': <CoffeeOutlined />,
  'desktop': <DesktopOutlined />,
  'thunder': <ThunderboltOutlined />,
  'car': <CarOutlined />,
  'safety': <SafetyOutlined />,
  'heart': <HeartOutlined />,
  'home': <HomeOutlined />,
  'location': <EnvironmentOutlined />,
  'compass': <CompassOutlined />,
  'app': <AppstoreOutlined />,
  'fire': <FireOutlined />,
  'global': <GlobalOutlined />,
  'trophy': <TrophyOutlined />,
  'rocket': <RocketOutlined />,
  'star': <StarOutlined />,
  'shop': <ShopOutlined />,
  'shopping': <ShoppingOutlined />,
  'skin': <SkinOutlined />,
  'sound': <SoundOutlined />,
  'customer-service': <CustomerServiceOutlined />,
  'team': <TeamOutlined />,
  'tool': <ToolOutlined />,
  'truck': <TruckOutlined />,
  'wallet': <WalletOutlined />,
  'laptop': <LaptopOutlined />,
  'picture': <PictureOutlined />,
  'gift': <GiftOutlined />,
  'notification': <NotificationOutlined />,
  'phone': <PhoneOutlined />,
  'robot': <RobotOutlined />,
  'smile': <SmileOutlined />,
  'trophy-filled': <TrophyFilled />,
  'format-painter': <FormatPainterOutlined />,
  'bulb': <BulbOutlined />,
  'setting': <SettingOutlined />,
  'like': <LikeOutlined />,
  'menu': <MenuOutlined />,
  'mail': <MailOutlined />,
  'bell': <BellOutlined />,
  'plus': <PlusOutlined />,
  'control': <ControlOutlined />,
};

/**
 * Get React icon component from icon name
 * @param iconName - Name of the icon
 * @returns React element of the icon or undefined if not found
 */
export const getIconByName = (iconName?: string): React.ReactNode => {
  if (!iconName) return undefined;
  return iconMap[iconName] || <AppstoreOutlined />;
};

/**
 * Get available icon names for select options
 * @returns Array of objects with label and value for Select component
 */
export const getIconOptions = () => {
  return Object.keys(iconMap).map(iconName => ({
    label: (
      <div className="flex items-center gap-2">
        {iconMap[iconName]}
        <span className="capitalize">{iconName.replace(/-/g, ' ')}</span>
      </div>
    ),
    value: iconName
  }));
}; 