/** Composite: componente comum a serviços atômicos e pacotes. */
export default interface ServicoProjeto{
    /** Custo total (soma recursiva nos pacotes). */
    calcularCusto():number;
    /** Subserviços diretos (vazio para serviços atômicos). */
    listarSubservicos():ServicoProjeto[];
    /** Prazos (datas de entrega) de todos os serviços atômicos da hierarquia. */
    obterPrazo():Date[];
    /** Validação recursiva da estrutura. */
    validar():boolean;
}
