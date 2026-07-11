import NextAuth from 'next-auth';
import type { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';

interface DbUser {
  user_id: string;
  name: string;
  role: string;
  email: string;
  password_hash: string | null;
}

const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const result = await pool.query<DbUser>(
          `SELECT user_id, name, role, email, password_hash FROM users WHERE email = $1`,
          [credentials.email]
        );
        const user = result.rows[0];
        if (!user || !user.password_hash) return null;

        const valid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!valid) return null;

        return { id: user.user_id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = (user as { role?: string }).role;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as typeof session.user & { role?: string }).role = token.role as string | undefined;
      return session;
    },
  },
  pages: { signIn: '/login' },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
