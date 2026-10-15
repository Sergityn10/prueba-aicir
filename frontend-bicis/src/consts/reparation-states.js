export const ESTADOS = {
  PENDIENTE: "Pendiente",
  EN_REPARACION: "En reparación",
  TERMINADA: "Terminada",
};

export const LISTA_ESTADOS = [
  ESTADOS.PENDIENTE,
  ESTADOS.EN_REPARACION,
  ESTADOS.TERMINADA,
];

export const ESTADO_METADATA = {
  [ESTADOS.PENDIENTE]: {
    label: "Pendiente",
    className: "badge-pendiente",
    icon: "⏳",
    description: "En espera de inicio de trabajo"
  },
  [ESTADOS.EN_REPARACION]: {
    label: "En reparación",
    className: "badge-en-reparacion",
    icon: "🔧",
    description: "En el caballete de trabajo"
  },
  [ESTADOS.TERMINADA]: {
    label: "Terminada",
    className: "badge-terminada",
    icon: "✅",
    description: "Lista para entregar al cliente"
  }
};
