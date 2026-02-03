import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import Dashboard from '@/app/dashboard/page';

// Mock necessary hooks and components used in the dashboard
jest.mock('@/components/layout/Navbar', () => () => <div>Navbar</div>);
jest.mock('@/components/layout/Sidebar', () => () => <div>Sidebar</div>);
jest.mock('@/components/layout/NotificationBell', () => () => <div>NotificationBell</div>);

// Test suite for the Dashboard page
describe('Dashboard Page', () => {
  test('it renders without crashing', () => {
    render(<Dashboard />);
    expect(screen.getByText('Navbar')).toBeInTheDocument();
    expect(screen.getByText('Sidebar')).toBeInTheDocument();
    expect(screen.getByText('NotificationBell')).toBeInTheDocument();
  });

  test('it displays the dashboard content', () => {
    render(<Dashboard />);
    // Assuming the Dashboard has some specific text/content;
    // replace 'Dashboard Content' with actual text checked in your component
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });
});
