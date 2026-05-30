import { betterAuth } from "better-auth";
import { mongodbAdapter} from "better-auth/adapters/mongodb";
import { connectToDatabase} from "@/database/mongoose";
import { nextCookies} from "better-auth/next-js";

let authInstance: ReturnType<typeof betterAuth> | null = null;

export const getAuth = async () => {
    if(authInstance) return authInstance;

    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;

    if(!db) throw new Error('MongoDB connection not found');

    authInstance = betterAuth({
        database: mongodbAdapter(db as any),
        secret: process.env.BETTER_AUTH_SECRET,
        baseURL: process.env.BETTER_AUTH_URL,
        emailAndPassword: {
            enabled: true,
            disableSignUp: false,
            requireEmailVerification: false,
            minPasswordLength: 8,
            maxPasswordLength: 128,
            autoSignIn: true,
        },
        plugins: [nextCookies()],
    });

    return authInstance;
}

// Deep lazy proxy - resolves auth instance on first use at runtime (not build time)
// Supports nested access like auth.api.getSession(...)
function createDeepProxy(getPath: string[] = []): any {
    return new Proxy(function(){}, {
        get(_target, prop: string) {
            return createDeepProxy([...getPath, prop]);
        },
        apply(_target, _thisArg, args) {
            return (async () => {
                const instance = await getAuth();
                // Walk the property path on the real instance
                let value: any = instance;
                for (const key of getPath) {
                    value = value[key];
                }
                if (typeof value === "function") {
                    // Bind to the parent object
                    let parent: any = instance;
                    for (const key of getPath.slice(0, -1)) {
                        parent = parent[key];
                    }
                    return value.apply(parent, args);
                }
                return value;
            })();
        }
    });
}

export const auth = createDeepProxy() as Awaited<ReturnType<typeof getAuth>>;
