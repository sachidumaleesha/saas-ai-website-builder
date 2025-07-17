# 🚀 SaaS AI Website Builder 🚀

Welcome to the **SaaS AI Website Builder**! This project is a powerful, open-source platform that allows you to generate, customize, and deploy websites using the power of Artificial Intelligence. Describe your desired website in a prompt, and watch as our AI brings it to life in a live, interactive preview.

## ✨ Key Features

- 🚀 **Next.js 15 & React 19**: Built with the latest, most powerful web technologies for a fast and modern user experience.
- 🎨 **Tailwind v4 + Shadcn/UI**: A beautiful and customizable UI, built with the best-in-class utility-first CSS framework.
- 📡 **tRPC for Full-Stack Type Safety**: Enjoy end-to-end type safety between your frontend and backend, making your code more robust and easier to refactor.
- 🧠 **AI-Powered Website Generation**: Generate entire websites from a single text prompt using powerful AI models.
- 🔐 **Clerk Authentication**: Secure and easy-to-use authentication to manage user accounts.
- 🧱 **Component & App Generation**: AI-powered generation of both individual components and entire applications.
- 🗂️ **Live Project Preview**: Get a live, shareable URL for every generated project to preview your creation in real-time.
- 🖥️ **E2B Cloud Sandboxes**: Code execution in a secure, cloud-based sandbox environment.
- 🐳 **Docker-Based Sandbox Templating**: Easily create and customize sandbox environments using Docker.
- 🤖 **Multi-AI Model Support**: Integrated with OpenAI, Gemini, and other models to give you a choice of AI power.
- 📦 **Prisma + Neon**: A next-generation, serverless Postgres database for scalable and reliable data management.
- 🧾 **Built-in Credit System**: A complete credit system to track and manage usage for different users.

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/), [Shadcn/UI](https://ui.shadcn.com/)
- **API**: [tRPC](https://trpc.io/)
- **Authentication**: [Clerk](https://clerk.com/)
- **Billing**: [Clerk](https://clerk.com/billing/)
- **AI**: [OpenAI](https://openai.com/), [Google Gemini](https://gemini.com/)
- **Database**: [Prisma](https://www.prisma.io/), [Neon](https://neon.tech/)
- **Background Jobs**: [Inngest](https://www.inngest.com/)
- **Sandboxing**: [E2B](https://www.e2b.dev/)
- **Deployment**: [Vercel](https://vercel.com/)

## 🔑 Environment Variables

To run this project, you will need to add the following environment variables to your `.env` file:

```bash
# The base URL of your application
APP_URL=http://localhost:3000

# API key for OpenAI
OPENAI_API_KEY="your-openai-api-key"

# API key for Google Gemini
GEMINI_API_KEY="your-gemini-api-key"

# API key for E2B cloud sandboxes
E2B_API_KEY="your-e2b-api-key"

# Connection URL for your PostgreSQL database (e.g., from Neon)
DATABASE_URL="your-database-url"

# Clerk API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your-clerk-publishable-key"
CLERK_SECRET_KEY="your-clerk-secret-key"

NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL="/"
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL="/"
```

## 🚀 Getting Started

Follow these steps to get the project up and running on your local machine.

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or higher)
- [Bun](https://bun.sh/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/saas-ai-website-builder.git
   cd saas-ai-website-builder
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Set up environment variables:**
   - Create a `.env` file in the root of the project.
   - Copy the contents of `.env.example` (if available) or use the template above and fill in your keys.

4. **Run the development server:**
   ```bash
   bun run dev
   ```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

## 🤝 Contributing

Contributions are welcome! If you have any ideas, suggestions, or bug reports, please open an issue or submit a pull request.

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
