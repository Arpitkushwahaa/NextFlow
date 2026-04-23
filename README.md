# NextFlow - AI Workflow Builder

NextFlow is a powerful, node-based AI workflow platform that enables users to create, manage, and execute complex LLM pipelines using a visual drag-and-drop interface. Built with Next.js 15, it provides an intuitive way to chain AI models together for content generation, image analysis, and more.

## 📸 Screenshots

**Landing Page**

![NextFlow Landing Page](https://github.com/Arpitkushwahaa/NextFlow/blob/main/public/screenshots/landing-page.png?raw=true)

**Workflow Builder**

![NextFlow Workflow Builder](https://github.com/Arpitkushwahaa/NextFlow/blob/main/public/screenshots/workflow-builder.png?raw=true)

## 🚀 Features

### Core Functionality
- **Visual Workflow Builder** - Drag-and-drop nodes to create AI pipelines
- **Multiple Node Types:**
  - 📝 Text Node - Enter prompts and descriptions
  - 🖼️ Image Node - Upload and process images
  - 🤖 LLM Node - Connect to OpenAI and Gemini models
  - 📤 Upload Node - Handle file uploads
  - ✂️ Crop Image Node - Visual image cropping
  - 🎬 Extract Frame Node - Extract frames from videos
- **Real-time Connections** - Connect nodes with animated edges
- **Workflow Persistence** - Save, load, and manage workflows
- **Background Execution** - Run long-duration tasks with Trigger.dev

### Authentication
- **Clerk Auth** - Secure user authentication and management
- **Protected Routes** - Dashboard and workflow canvas restricted to authenticated users
- **Session Management** - Secure JWT-based sessions

### User Experience
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Dark Theme** - Modern dark UI for reduced eye strain
- **Keyboard Shortcuts** - Efficient workflow management
- **Undo/Redo** - Full history support for workflow changes
- **Export/Import** - Share workflows as JSON files

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **Canvas**: React Flow
- **Database**: PostgreSQL (Neon), Prisma ORM
- **Auth**: Clerk
- **Background Jobs**: Trigger.dev v4
- **Media Processing**: Transloadit (FFmpeg)
- **State Management**: Zustand
- **AI Models**: OpenAI, Google Gemini

## 📁 Project Structure

```text
NextFlow/
├── prisma/           database schema and migrations
├── public/           static assets (images, icons)
├── src/
│   ├── app/          Next.js routes and pages
│   │   ├── api/      API routes
│   │   ├── dashboard/
│   │   ├── login/
│   │   └── workflow/
│   ├── components/   React components
│   │   ├── nodes/    React Flow node types
│   │   └── landing/  Landing page components
│   ├── lib/          Utilities and client instances
│   ├── models/       Data models and types
│   ├── store/        Zustand state management
│   └── types/        TypeScript interfaces
├── trigger/          Trigger.dev task definitions
└── .github/          GitHub config and instructions
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- API keys for Clerk, OpenAI/Gemini, and Neon Database

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Arpitkushwahaa/NextFlow.git
   cd NextFlow
   ```

2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

3. Set up environment variables in `.env`:
   ```env
   # Database (Neon PostgreSQL)
   DATABASE_URL="postgresql://user:password@your-neon-host.neon.tech/dbname?sslmode=require"

   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
   CLERK_SECRET_KEY="sk_test_..."
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/login
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

   # AI Models
   OPENAI_API_KEY="sk-..."
   GEMINI_API_KEY="AIzaSy..."
   ```

4. Initialize the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📝 Notes

- Trigger.dev and Transloadit credentials are optional for local development
- Add them when you're ready to deploy background jobs or media processing
- All workflows are saved to the Neon database
- Authentication is required to access the dashboard

## 📄 License

This project is open source and available under the MIT License.

---

**Made by [Arpit Kushwaha](https://github.com/Arpitkushwahaa)**
