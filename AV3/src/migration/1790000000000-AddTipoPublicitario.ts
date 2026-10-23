import { MigrationInterface, QueryRunner } from "typeorm";

/** Atividade 2: novo tipo de projeto (Abstract Factory/FabricaPublicitario). */
export class AddTipoPublicitario1790000000000 implements MigrationInterface {
    name = 'AddTipoPublicitario1790000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."projetos_tipo_enum" ADD VALUE IF NOT EXISTS 'PUBLICITARIO'`);
    }

    public async down(): Promise<void> {
        // Postgres não remove valores de enum; reverter exigiria recriar o tipo. Mantido de propósito.
    }
}
