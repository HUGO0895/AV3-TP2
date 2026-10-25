/** Contrato padronizado de armazenamento de mídia (Adapter: interface alvo). */
export default interface AdaptadorArmazenamento{
    salvarArquivo(conteudo:Buffer,metadados:any):string;
    recuperarArquivo(id:string):Buffer;
    listarArquivos(prefixo:string):string[];
}
