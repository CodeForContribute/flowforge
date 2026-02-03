
import { render, screen, fireEvent } from '@testing-library/react';
import ReviewFlow from '../../src/components/ReviewFlow';

// Mock data to use in tests
const mockReviewData = {
  user: 'TestUser',
  comments: ['Good work', 'Needs improvement'],
  status: 'pending'
};

// Helper function to set up the test environment
const setup = (overrideProps = {}) => {
  const props = { ...mockReviewData, ...overrideProps };
  render(<ReviewFlow {...props} />);
};

describe('ReviewFlow Component', () => {
  test('renders the user name', () => {
    setup();
    expect(screen.getByText('Reviewed by: TestUser')).toBeInTheDocument();
  });

  test('renders all comments', () => {
    setup();
    expect(screen.getByText('Good work')).toBeInTheDocument();
    expect(screen.getByText('Needs improvement')).toBeInTheDocument();
  });

  test('renders pending status by default', () => {
    setup();
    expect(screen.getByText('Status: pending')).toBeInTheDocument();
  });

  test('changes status to approved on approve action', () => {
    setup();
    fireEvent.click(screen.getByText('Approve'));
    expect(screen.getByText('Status: approved')).toBeInTheDocument();
  });

  test('changes status to changes requested on request changes action', () => {
    setup();
    fireEvent.click(screen.getByText('Request Changes'));
    expect(screen.getByText('Status: changes requested')).toBeInTheDocument();
  });

  test('handles no comments scenario gracefully', () => {
    setup({ comments: [] });
    expect(screen.queryByText('Good work')).not.toBeInTheDocument();
    expect(screen.getByText(/no comments/i)).toBeInTheDocument();
  });
});
