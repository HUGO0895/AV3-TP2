/** Interface "estrangeira" (Adaptee) de um provedor de armazenamento: cada provedor a expõe à sua maneira. */
export default interface SistemaArmazenamentoExterno{
    upload(caminho:string,dados:Buffer):void;
    download(caminho:string):Buffer;
    listar(pasta:string):string[];
}
