import {
  generateCode,
  respondToReview,
  classifyComment,
  generateDiscussionReply,
  generateCodeFromComment,
} from '../agent';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai', () => {
  const mockCreate = jest.fn();
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }));
});

describe('agent service', () => {
  let mockOpenAI: jest.Mocked<OpenAI>;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // Get the mocked instance
    const OpenAIMock = OpenAI as jest.MockedClass<typeof OpenAI>;
    mockOpenAI = new OpenAIMock() as jest.Mocked<OpenAI>;
    mockCreate = (mockOpenAI.chat.completions.create as jest.Mock);
  });

  describe('generateCode', () => {
    it('should generate code successfully with valid response', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              files: [
                { path: 'src/index.ts', content: 'console.log("hello");', action: 'create' },
              ],
              summary: 'Created index file',
            }),
          },
        }],
      });

      const result = await generateCode({
        prompt: 'Create a hello world file',
        model: 'gpt-4o',
      });

      expect(result.files).toHaveLength(1);
      expect(result.files[0].path).toBe('src/index.ts');
      expect(result.files[0].action).toBe('create');
      expect(result.summary).toBe('Created index file');
    });

    it('should use default model if not specified', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              files: [],
              summary: 'Done',
            }),
          },
        }],
      });

      await generateCode({ prompt: 'test' });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'gpt-4o' })
      );
    });

    it('should throw error if no text content in response', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      await expect(
        generateCode({ prompt: 'test' })
      ).rejects.toThrow('No text content in response');
    });

    it('should throw error if no JSON found in response', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'No JSON here' } }],
      });

      await expect(
        generateCode({ prompt: 'test' })
      ).rejects.toThrow('Could not find JSON in response');
    });

    it('should throw error if files is not an array', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({ files: 'not an array', summary: 'test' }),
          },
        }],
      });

      await expect(
        generateCode({ prompt: 'test' })
      ).rejects.toThrow('Failed to parse code generation response');
    });

    it('should throw error if file has no path', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              files: [{ content: 'test', action: 'create' }],
              summary: 'test',
            }),
          },
        }],
      });

      await expect(
        generateCode({ prompt: 'test' })
      ).rejects.toThrow('Failed to parse code generation response');
    });

    it('should throw error if file has invalid action', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              files: [{ path: 'test.ts', content: 'test', action: 'invalid' }],
              summary: 'test',
            }),
          },
        }],
      });

      await expect(
        generateCode({ prompt: 'test' })
      ).rejects.toThrow('Failed to parse code generation response');
    });

    it('should throw error if non-delete file has no content', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              files: [{ path: 'test.ts', action: 'create' }],
              summary: 'test',
            }),
          },
        }],
      });

      await expect(
        generateCode({ prompt: 'test' })
      ).rejects.toThrow('Failed to parse code generation response');
    });

    it('should allow delete action without content', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              files: [{ path: 'obsolete.ts', action: 'delete' }],
              summary: 'Deleted file',
            }),
          },
        }],
      });

      const result = await generateCode({ prompt: 'Delete obsolete file' });

      expect(result.files[0].action).toBe('delete');
    });

    it('should provide default summary if not in response', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              files: [{ path: 'test.ts', content: 'test', action: 'create' }],
            }),
          },
        }],
      });

      const result = await generateCode({ prompt: 'test' });

      expect(result.summary).toBe('Implementation completed');
    });

    it('should extract JSON from text with surrounding content', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: `Here is the response:\n${JSON.stringify({
              files: [{ path: 'test.ts', content: 'test', action: 'create' }],
              summary: 'Done',
            })}\nEnd of response`,
          },
        }],
      });

      const result = await generateCode({ prompt: 'test' });

      expect(result.files).toHaveLength(1);
    });
  });

  describe('respondToReview', () => {
    it('should respond to review successfully', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              files: [{ path: 'src/fix.ts', content: 'fixed code', action: 'update' }],
              explanation: 'Fixed the issue',
            }),
          },
        }],
      });

      const result = await respondToReview({
        prompt: 'Address review comments',
      });

      expect(result.files).toHaveLength(1);
      expect(result.explanation).toBe('Fixed the issue');
    });

    it('should throw error if no text content', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      await expect(
        respondToReview({ prompt: 'test' })
      ).rejects.toThrow('No text content in response');
    });

    it('should throw error if files is not an array', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({ files: 'invalid', explanation: 'test' }),
          },
        }],
      });

      await expect(
        respondToReview({ prompt: 'test' })
      ).rejects.toThrow('Failed to parse review response');
    });

    it('should provide default explanation if not in response', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({ files: [] }),
          },
        }],
      });

      const result = await respondToReview({ prompt: 'test' });

      expect(result.explanation).toBe('Review comments addressed');
    });
  });

  describe('classifyComment', () => {
    const baseOptions = {
      commentBody: 'Please fix this bug',
      commentAuthor: 'reviewer',
      taskTitle: 'Add feature',
      taskDescription: 'Implement a feature',
    };

    it('should classify code change comments', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              intent: 'code_change',
              confidence: 0.95,
              reasoning: 'User requested a bug fix',
              suggestedAction: 'Fix the bug',
            }),
          },
        }],
      });

      const result = await classifyComment(baseOptions);

      expect(result.intent).toBe('code_change');
      expect(result.confidence).toBe(0.95);
    });

    it('should classify discussion comments', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              intent: 'discussion',
              confidence: 0.8,
              reasoning: 'User is asking a question',
              suggestedAction: 'Provide explanation',
            }),
          },
        }],
      });

      const result = await classifyComment({
        ...baseOptions,
        commentBody: 'Why did you choose this approach?',
      });

      expect(result.intent).toBe('discussion');
    });

    it('should normalize invalid intent to discussion', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              intent: 'invalid_intent',
              confidence: 0.5,
            }),
          },
        }],
      });

      const result = await classifyComment(baseOptions);

      expect(result.intent).toBe('discussion');
    });

    it('should clamp confidence between 0 and 1', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              intent: 'code_change',
              confidence: 1.5, // Over 1
            }),
          },
        }],
      });

      const result = await classifyComment(baseOptions);

      expect(result.confidence).toBe(1);
    });

    it('should provide default reasoning and suggestedAction', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              intent: 'discussion',
              confidence: 0.7,
            }),
          },
        }],
      });

      const result = await classifyComment(baseOptions);

      expect(result.reasoning).toBe('No reasoning provided');
      expect(result.suggestedAction).toBe('Review the comment');
    });

    it('should return default classification on parse error', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: '{ invalid json }',
          },
        }],
      });

      const result = await classifyComment(baseOptions);

      expect(result.intent).toBe('discussion');
      expect(result.confidence).toBe(0.5);
      expect(result.reasoning).toContain('Failed to parse');
    });

    it('should throw error if no text content', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      await expect(
        classifyComment(baseOptions)
      ).rejects.toThrow('No text content in response');
    });

    it('should include prContext when provided', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              intent: 'discussion',
              confidence: 0.8,
            }),
          },
        }],
      });

      await classifyComment({
        ...baseOptions,
        prContext: 'Additional PR context',
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Additional PR context'),
            }),
          ]),
        })
      );
    });
  });

  describe('generateDiscussionReply', () => {
    const baseOptions = {
      commentBody: 'Why did you use this pattern?',
      commentAuthor: 'reviewer',
      taskTitle: 'Add feature',
      taskDescription: 'Implement a feature',
    };

    it('should generate a discussion reply', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              reply: 'I used this pattern because...',
            }),
          },
        }],
      });

      const result = await generateDiscussionReply(baseOptions);

      expect(result.reply).toBe('I used this pattern because...');
    });

    it('should include file context when provided', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({ reply: 'Response' }),
          },
        }],
      });

      await generateDiscussionReply({
        ...baseOptions,
        currentFiles: [
          { path: 'src/index.ts', content: 'code here' },
        ],
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('src/index.ts'),
            }),
          ]),
        })
      );
    });

    it('should provide default reply if not in response', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({}),
          },
        }],
      });

      const result = await generateDiscussionReply(baseOptions);

      expect(result.reply).toContain('Thank you for your comment');
    });

    it('should throw error on parse failure', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: 'not json at all',
          },
        }],
      });

      await expect(
        generateDiscussionReply(baseOptions)
      ).rejects.toThrow('Could not find JSON in response');
    });
  });

  describe('generateCodeFromComment', () => {
    const baseOptions = {
      commentBody: 'Please add error handling',
      commentAuthor: 'reviewer',
      taskTitle: 'Add feature',
      taskDescription: 'Implement a feature',
      currentFiles: [
        { path: 'src/index.ts', content: 'const x = 1;' },
      ],
    };

    it('should generate code changes from comment', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              files: [
                { path: 'src/index.ts', content: 'try { const x = 1; } catch (e) {}', action: 'update' },
              ],
              explanation: 'Added error handling',
            }),
          },
        }],
      });

      const result = await generateCodeFromComment(baseOptions);

      expect(result.files).toHaveLength(1);
      expect(result.explanation).toBe('Added error handling');
    });

    it('should throw error if files is not an array', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              files: 'not an array',
              explanation: 'test',
            }),
          },
        }],
      });

      await expect(
        generateCodeFromComment(baseOptions)
      ).rejects.toThrow('Failed to parse code generation response');
    });

    it('should provide default explanation if not in response', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              files: [],
            }),
          },
        }],
      });

      const result = await generateCodeFromComment(baseOptions);

      expect(result.explanation).toBe('Changes implemented based on comment');
    });

    it('should include file context in prompt', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({ files: [], explanation: 'Done' }),
          },
        }],
      });

      await generateCodeFromComment(baseOptions);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('const x = 1;'),
            }),
          ]),
        })
      );
    });
  });
});
