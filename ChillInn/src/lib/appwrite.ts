import { Client, Storage, ID, Account, Permission, Role } from 'appwrite';

const client = new Client()
    .setEndpoint(import.meta.env.VITE_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_PUBLIC_APPWRITE_PROJECT_ID);

const account = new Account(client);

// Create anonymous session for uploads
const createAnonymousSession = async () => {
    try {
        // Check for existing session
        try {
            await account.get();
            return;
        } catch (error) {
            // No session found, create new anonymous session
            await account.createAnonymousSession();
        }
    } catch (error: any) {
        console.error('Session error:', error);
        throw error;
    }
};

export const storage = new Storage(client);

export const uploadFile = async (file: File) => {
    try {
        // Ensure active session
        await createAnonymousSession();
        
        // Get current user ID from anonymous session
        const currentUser = await account.get();

        // Create file with proper permissions
        const response = await storage.createFile(
            import.meta.env.VITE_PUBLIC_APPWRITE_BUCKET_ID,
            ID.unique(),
            file,
            [
                // Allow owner to read/write
                Permission.read(Role.user(currentUser.$id)),
                Permission.write(Role.user(currentUser.$id)),
                // Add public read if needed
                // Permission.read(Role.any())
            ]
        );

        const fileUrl = `${import.meta.env.VITE_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${import.meta.env.VITE_PUBLIC_APPWRITE_BUCKET_ID}/files/${response.$id}/view?project=${import.meta.env.VITE_PUBLIC_APPWRITE_PROJECT_ID}`;

        return {
            fileId: response.$id,
            url: fileUrl
        };
    } catch (error: any) {
        console.error('Upload error:', error);
        
        if (error.code === 401) {
            throw new Error("Authentication failed. Please try again.");
        } else if (error.code === 413) {
            throw new Error("File is too large. Please choose a smaller file.");
        } else {
            throw new Error(error.message || "Failed to upload image. Please try again.");
        }
    }
};