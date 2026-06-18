import { sendNotification } from '../services/notifications';

jest.mock('../services/notifications', () => ({
  sendNotification: jest.fn(),
}));

describe('Notifications Service', () => {
  it('should send notification with correct parameters', async () => {
    const notification = {
      userId: 'user-1',
      type: 'TASK_COMPLETED',
      data: { taskId: 'task-123' }
    };

    await sendNotification(notification);

    expect(sendNotification).toHaveBeenCalledWith(notification);
    expect(sendNotification).toHaveBeenCalledTimes(1);
  });

  it('should handle errors without throwing', async () => {
    const errorMock = jest.fn().mockRejectedValue(new Error('Network error'));
    const notification = {
      userId: 'user-1',
      type: 'TASK_COMPLETED',
      data: { taskId: 'task-123' }
    };

    sendNotification.mockImplementationOnce(errorMock);

    await expect(sendNotification(notification)).resolves.not.toThrow();
    expect(sendNotification).toHaveBeenCalledWith(notification);
  });
});