import React from 'react';
import { Layout, Typography } from 'antd';
import { StarOutlined } from '@ant-design/icons';
import AdminReviewsTable from '../components/AdminReviewsTable';
import AppLayout from '../components/AppLayout';
import PageTransition from '../components/PageTransition';

const { Content } = Layout;
const { Title } = Typography;

const ReviewManagement: React.FC = () => {
  return (
    <AppLayout userRole="admin">
      <PageTransition>
        <Content className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <StarOutlined className="text-2xl text-[#D4AF37]" />
              <Title level={3} className="m-0">Review Management</Title>
            </div>
            
            <AdminReviewsTable />
          </div>
        </Content>
      </PageTransition>
    </AppLayout>
  );
};

export default ReviewManagement; 