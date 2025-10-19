// Definición mínima para evitar error de módulo
export interface ClientAccount {
	id: string;
	user_id?: string;
	stripe_account_id?: string;
	nombre?: string;
	email?: string;
	business_name?: string;
	country?: string;
	platform_fee_percent?: number;
	created_at?: string;
}

export class ClientAccountManager {
	static async getAll(): Promise<ClientAccount[]> {
		return [];
	}
	static async getById(id: string): Promise<ClientAccount | null> {
		return null;
	}
	static async getAllActiveClients(): Promise<ClientAccount[]> {
		// Simulación: devolver array vacío
		return [];
	}
	static async createClient(data: Partial<ClientAccount>): Promise<{ success: boolean; client?: ClientAccount; error?: string }> {
		// Simulación: devolver cliente creado
		const client: ClientAccount = {
			id: 'temp-' + Date.now(),
			...data
		};
		return { success: true, client };
	}
}
