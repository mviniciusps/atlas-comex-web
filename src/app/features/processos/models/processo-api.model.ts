export interface ProcessoApiDto {
    idProcesso: number;
    idImportador: number;
    razaoSocialImportador: string;
    idEstabelecimento: number;
    cnpj: string;
    numeroProcesso: string;
    referenciaCliente: string | null;
    previsaoChegada: string | null;
    chegada: string | null;
    exportador: string | null;
    observacoes: string | null;
    conhecimentoMaster: string | null;
    conhecimentoHouse: string | null;
    modal: string | null;
    ceMercanteRuc: string | null;
    duimp: string | null;
    dataRegistro: string | null;
    desembaraco: string | null;
    recintoAlfandegado: string | null;
    situacao: string | null;
}