import { createInterface } from 'readline';

/**
 * Display a query to the user and wait for their input. Return true if the user enters `y`.
 */
export async function promptUser(question: string): Promise<boolean> {
    return new Promise((resolve) => {
        const rl = createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y');
        });
    });
}
