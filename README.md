# Flowforge

## Introduction
Flowforge is a powerful platform designed to streamline the development process by integrating various tools and services into a cohesive and efficient workspace. It leverages modern web technologies to provide seamless project management, issue tracking, and automation capabilities.

## Architecture
Flowforge utilizes a scalable and modular architecture based on microservices. The core components include:

- **User Authentication and Authorization**: Handled via NextAuth.js with support for OAuth providers like GitHub.
- **Project Management**: Track and manage projects, tasks, and sprints using a robust backend powered by Prisma ORM and PostgreSQL.
- **Task Automation**: Integrates with AI services such as Anthropic and OpenAI to enhance task execution and monitoring.
- **Real-Time Messaging and Queues**: Uses BullMQ and Redis to handle asynchronous processing and task queues efficiently.

## Features
- **Task and Project Management**: Create, assign, and monitor tasks across multiple projects.
- **Kanban and Sprint Boards**: Visualize workflows and sprints with easy drag-and-drop functionality.
- **Integration with GitHub**: Link your repository for automatic updates and task tracking.
- **Customizable Dashboard**: Tailor your dashboard with widgets for metrics and notifications.
- **Secure Access**: Roles and permissions ensure that users access only what they need.

## Getting Started
To start using Flowforge, follow these steps:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/CodeForContribute/flowforge.git
   ```

2. **Setup Environment Variables**:
   Copy the `.env.example` file to `.env` and configure the necessary variables.

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Database Setup**:
   Ensure PostgreSQL and Redis are running, then run:
   ```bash
   npm run db:push
   npm run db:seed:test
   ```

5. **Run the Development Server**:
   ```bash
   npm run dev
   ```

Access the application at [http://localhost:3000](http://localhost:3000).

## Contributing
We welcome contributions to Flowforge. Please refer to our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute.

## License
Flowforge is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.
