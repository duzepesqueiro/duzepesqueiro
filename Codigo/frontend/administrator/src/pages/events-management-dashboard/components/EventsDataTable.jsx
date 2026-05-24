import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Icon from "../../../components/AppIcon";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import { getAllEvents, createEvent, updateEvent, deleteEvent } from "../../../utils/eventService";

const statusOptions = [
  { value: "ALL", label: "Todos os Status" },
  { value: "SCHEDULED", label: "Agendado" },
  { value: "UPCOMING", label: "Em Breve" },
  { value: "IN_PROGRESS", label: "Em Andamento" },
  { value: "COMPLETED", label: "Concluído" },
  { value: "CANCELLED", label: "Cancelado" },
];

const itemsPerPageOptions = [
  { value: 10, label: "10 por página" },
  { value: 20, label: "20 por página" },
  { value: 50, label: "50 por página" },
];

const toInputDate = (value) => {
  if (!value) return "";
  const datePart = String(value).split("T")[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return "";
  return datePart;
};

const toBrDate = (value) => {
  if (!value) return "-";
  const datePart = String(value).split("T")[0];
  const parts = datePart.split("-");
  if (parts.length !== 3) return "-";
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

const toBrDateFilter = (value) => {
  if (!value || !value.includes("-")) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const computeStatus = (eventDate, eventTime, currentStatus) => {
  if (currentStatus === "CANCELLED") return "CANCELLED";
  if (!eventDate) return "SCHEDULED";
  const dateStr = eventTime ? `${eventDate}T${eventTime}:00` : `${eventDate}T00:00:00`;
  const eventDateTime = new Date(dateStr);
  if (isNaN(eventDateTime.getTime())) return "SCHEDULED";
  const diffMs = eventDateTime.getTime() - Date.now();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffMs < 0) return "COMPLETED";
  if (diffDays <= 3) return "UPCOMING";
  return "SCHEDULED";
};


const createEmptyEvent = () => ({
  id: "",
  title: "",
  description: "",
  rules: "",
  location: "",
  totalSlots: 1,
  eventDate: "",
  eventTime: "",
  isPaid: false,
  price: 0,
  status: "SCHEDULED",
  participantsCount: 0,
  availableSlots: 0,
  imageUrl: "",
  images: [],
});

const mapEventFromApi = (event) => ({
  ...(() => {
    const eventImages = Array.isArray(event?.images)
      ? event.images
      : Array.isArray(event?.eventImages)
      ? event.eventImages.map((image) =>
          typeof image === "string" ? image : image?.imageUrl || image?.url || ""
        )
      : [];
    const normalizedImages = eventImages.filter(Boolean);
    const fallbackImage =
      event?.imageUrl || event?.image || (typeof event?.eventImage === "string" ? event.eventImage : "");
    return {
      images: normalizedImages.length ? normalizedImages : fallbackImage ? [fallbackImage] : [],
    };
  })(),
  id: event?.id || "",
  title: event?.title || "",
  description: event?.description || "",
  rules: event?.rules || "",
  location: event?.location || "",
  totalSlots: toNumber(event?.totalSlots, 0),
  eventDate: toInputDate(event?.eventDate),
  eventTime: event?.eventTime || "",
  isPaid: Boolean(event?.isPaid),
  price: toNumber(event?.price, 0),
  status: event?.status || "SCHEDULED",
  participantsCount: toNumber(event?.participantsCount, 0),
  availableSlots: toNumber(event?.availableSlots, 0),
  imageUrl: event?.imageUrl || event?.image || "",
});

const EventsDataTable = ({ onDataChanged }) => {
  const [eventsData, setEventsData] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [titleFilter, setTitleFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [timeFilter, setTimeFilter] = useState("");
  const [participantsFilter, setParticipantsFilter] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tableError, setTableError] = useState(null);
  const [modalEvent, setModalEvent] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [eventImageFiles, setEventImageFiles] = useState([]);
  const [eventImagePreviews, setEventImagePreviews] = useState([]);
  const [isImageDragOver, setIsImageDragOver] = useState(false);
  const imageInputRef = useRef(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((totalItems || 0) / itemsPerPage)),
    [totalItems, itemsPerPage]
  );

  const fetchEvents = useCallback(async (notify = false) => {
    try {
      setLoading(true);
      const response = await getAllEvents({
        title: titleFilter || undefined,
        location: locationFilter || undefined,
        date: toBrDateFilter(dateFilter) || undefined,
        time: timeFilter || undefined,
        participants: participantsFilter ? Number(participantsFilter) : undefined,
        status: selectedStatus !== "ALL" ? selectedStatus : undefined,
        page: currentPage,
        limit: itemsPerPage,
      });
      const items = Array.isArray(response?.items) ? response.items : [];
      setEventsData(items.map(mapEventFromApi));
      setTotalItems(toNumber(response?.total, items.length));
      setTableError(null);
      if (notify && typeof onDataChanged === "function") {
        onDataChanged();
      }
    } catch (error) {
      console.error("Erro ao carregar eventos administrativos:", error);
      setEventsData([]);
      setTotalItems(0);
      setTableError("Não foi possível carregar os eventos.");
    } finally {
      setLoading(false);
    }
  }, [
    titleFilter,
    locationFilter,
    dateFilter,
    timeFilter,
    participantsFilter,
    selectedStatus,
    currentPage,
    itemsPerPage,
    onDataChanged,
  ]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  useEffect(() => {
    return () => {
      eventImagePreviews.forEach((preview) => {
        if (preview?.startsWith("blob:")) {
          URL.revokeObjectURL(preview);
        }
      });
    };
  }, [eventImagePreviews]);

  const getStatusColor = (status) => {
    switch (status) {
      case "SCHEDULED":
        return "bg-secondary/10 text-secondary";
      case "UPCOMING":
        return "bg-warning/10 text-warning";
      case "IN_PROGRESS":
        return "bg-primary/10 text-primary";
      case "COMPLETED":
        return "bg-success/10 text-success";
      case "CANCELLED":
        return "bg-error/10 text-error";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "SCHEDULED":
        return "Calendar";
      case "UPCOMING":
        return "Clock";
      case "IN_PROGRESS":
        return "Activity";
      case "COMPLETED":
        return "CheckCircle";
      case "CANCELLED":
        return "XCircle";
      default:
        return "Circle";
    }
  };

  const openModal = (type, event = null) => {
    setModalType(type);
    const mapped = event ? mapEventFromApi(event) : createEmptyEvent();
    setModalEvent(mapped);
    setEventImageFiles([]);
    setEventImagePreviews(Array.isArray(mapped.images) ? mapped.images : []);
  };

  const applySelectedImages = (selectedFiles) => {
    const newFiles = Array.from(selectedFiles || []);
    if (!newFiles.length) return;

    for (const file of newFiles) {
      if (!file.type?.startsWith("image/")) {
        alert("Selecione apenas arquivos de imagem válidos.");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        alert("Cada imagem deve ter no máximo 2MB.");
        return;
      }
    }

    const combined = [...eventImageFiles, ...newFiles];
    if (combined.length > 10) {
      alert("Você pode adicionar no máximo 10 imagens no total.");
      return;
    }

    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
    setEventImageFiles(combined);
    setEventImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeSelectedImage = (indexToRemove) => {
    const previewToRemove = eventImagePreviews[indexToRemove];
    if (previewToRemove?.startsWith("blob:")) {
      URL.revokeObjectURL(previewToRemove);
    }
    setEventImagePreviews((prev) => prev.filter((_, index) => index !== indexToRemove));
    setEventImageFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const openImagePicker = () => {
    if (modalType === "view" || saving) {
      return;
    }
    imageInputRef.current?.click();
  };

  const handleDropImage = (event) => {
    event.preventDefault();
    setIsImageDragOver(false);
    if (modalType === "view" || saving) {
      return;
    }
    applySelectedImages(event?.dataTransfer?.files);
  };

  const closeModal = () => {
    setModalType(null);
    setModalEvent(null);
    eventImagePreviews.forEach((preview) => {
      if (preview?.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    });
    setEventImagePreviews([]);
    setEventImageFiles([]);
  };

  const handleSaveEvent = async () => {
    try {
      if (!modalEvent?.title?.trim()) throw new Error("Título é obrigatório.");
      if (!modalEvent?.description?.trim()) throw new Error("Descrição é obrigatória.");
      if (!modalEvent?.rules?.trim()) throw new Error("Regras são obrigatórias.");
      if (!modalEvent?.location?.trim()) throw new Error("Local é obrigatório.");
      if (!modalEvent?.eventDate) throw new Error("Data é obrigatória.");
      if (!modalEvent?.eventTime) throw new Error("Horário é obrigatório.");
      if (toNumber(modalEvent?.totalSlots, 0) < 1) {
        throw new Error("Total de vagas deve ser maior ou igual a 1.");
      }
      if (modalEvent?.isPaid && toNumber(modalEvent?.price, -1) < 0) {
        throw new Error("Preço deve ser maior ou igual a zero.");
      }
      setSaving(true);
      const autoStatus = computeStatus(
        modalEvent.eventDate,
        modalEvent.eventTime,
        modalEvent.status
      );
      const payload = {
        title: modalEvent.title,
        description: modalEvent.description,
        rules: modalEvent.rules,
        location: modalEvent.location,
        totalSlots: toNumber(modalEvent.totalSlots, 1),
        eventDate: modalEvent.eventDate,
        eventTime: modalEvent.eventTime,
        isPaid: Boolean(modalEvent.isPaid),
        price: Boolean(modalEvent.isPaid) ? toNumber(modalEvent.price, 0) : 0,
        status: autoStatus,
      };
      if (modalType === "create") {
        await createEvent(payload, eventImageFiles);
      } else if (modalType === "edit") {
        await updateEvent(modalEvent.id, payload, eventImageFiles);
      }
      await fetchEvents(true);
      closeModal();
    } catch (err) {
      console.error("Erro ao salvar evento:", err);
      alert(err?.message || "Erro ao salvar o evento.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (event) => {
    if (window.confirm(`Deseja realmente deletar "${event.title}"?`)) {
      try {
        await deleteEvent(event.id);
        await fetchEvents(true);
      } catch (err) {
        console.error("Erro ao deletar:", err);
        alert("Erro ao deletar evento.");
      }
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="p-6 border-b border-border flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <h2 className="text-xl font-heading font-semibold text-foreground">
          Gerenciar Eventos
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="default" iconName="CalendarPlus" onClick={() => openModal("create")}>
            Novo Evento
          </Button>
          <Button variant="outline" iconName="RefreshCw" onClick={() => fetchEvents(true)}>
            Atualizar
          </Button>
        </div>
      </div>

      <div className="p-6 border-b border-border grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <Input
          type="search"
          label="Título"
          placeholder="Buscar por título..."
          value={titleFilter}
          onChange={(e) => {
            setTitleFilter(e.target.value);
            setCurrentPage(1);
          }}
        />
        <Input
          type="search"
          label="Local"
          placeholder="Buscar por local..."
          value={locationFilter}
          onChange={(e) => {
            setLocationFilter(e.target.value);
            setCurrentPage(1);
          }}
        />
        <Select
          label="Status"
          options={statusOptions}
          value={selectedStatus}
          onChange={(value) => {
            setSelectedStatus(value || "ALL");
            setCurrentPage(1);
          }}
        />
        <Input
          label="Data"
          type="date"
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value);
            setCurrentPage(1);
          }}
        />
        <Input
          label="Horário"
          type="time"
          value={timeFilter}
          onChange={(e) => {
            setTimeFilter(e.target.value);
            setCurrentPage(1);
          }}
        />
        <Input
          label="Mínimo de Participantes"
          type="number"
          min="0"
          value={participantsFilter}
          onChange={(e) => {
            setParticipantsFilter(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">TÍTULO</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">DATA</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">HORÁRIO</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">LOCAL</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">PARTICIPANTES</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">STATUS</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center p-6 text-muted-foreground">
                  Carregando eventos...
                </td>
              </tr>
            ) : tableError ? (
              <tr>
                <td colSpan="7" className="text-center p-6 text-error">
                  {tableError}
                </td>
              </tr>
            ) : eventsData.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center p-6 text-muted-foreground">
                  Nenhum evento encontrado.
                </td>
              </tr>
            ) : (
              eventsData.map((event) => (
                <tr key={event.id} className="hover:bg-muted/50 transition-smooth">
                  <td className="p-4 font-medium text-foreground">{event.title}</td>
                  <td className="p-4 text-sm text-muted-foreground">{toBrDate(event.eventDate)}</td>
                  <td className="p-4 text-sm text-muted-foreground">{event.eventTime || "-"}</td>
                  <td className="p-4 text-sm text-muted-foreground">{event.location}</td>
                  <td className="p-4 text-sm text-muted-foreground">{event.participantsCount}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}
                    >
                      <Icon name={getStatusIcon(event.status)} size={12} className="mr-1" />
                      {statusOptions.find((opt) => opt.value === event.status)?.label || event.status}
                    </span>
                  </td>
                  <td className="p-4 flex space-x-2">
                    <Button variant="ghost" size="sm" iconName="Edit" onClick={() => openModal("edit", event)} />
                    <Button variant="ghost" size="sm" iconName="Eye" onClick={() => openModal("view", event)} />
                    <Button variant="ghost" size="sm" iconName="Trash2" onClick={() => handleDelete(event)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between p-6 border-t border-border">
        <Select
          options={itemsPerPageOptions}
          value={itemsPerPage}
          onChange={(value) => {
            setItemsPerPage(Number(value) || 20);
            setCurrentPage(1);
          }}
          className="w-32"
        />
        <p className="text-sm text-muted-foreground">
          Página {currentPage} de {Math.max(1, totalPages)}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            iconName="ChevronLeft"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage <= 1}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            iconName="ChevronRight"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage >= totalPages}
          >
            Próximo
          </Button>
        </div>
      </div>

      {modalEvent && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative bg-card border border-border rounded-lg p-6 w-full max-w-md sm:max-w-lg lg:max-w-3xl max-h-[90vh] overflow-y-auto mx-4">
            <h3 className="text-lg font-heading font-semibold text-foreground mb-4">
              {modalType === "create"
                ? "Novo Evento"
                : modalType === "edit"
                ? "Editar Evento"
                : "Visualizar Evento"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Título"
                value={modalEvent.title || ""}
                onChange={(e) => modalType !== "view" && setModalEvent((prev) => ({ ...prev, title: e.target.value }))}
                readOnly={modalType === "view"}
              />

              <Input
                label="Local"
                value={modalEvent.location || ""}
                onChange={(e) => modalType !== "view" && setModalEvent((prev) => ({ ...prev, location: e.target.value }))}
                readOnly={modalType === "view"}
              />

              <Input
                label="Data"
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={modalEvent.eventDate || ""}
                onChange={(e) => modalType !== "view" && setModalEvent((prev) => ({ ...prev, eventDate: e.target.value }))}
                readOnly={modalType === "view"}
              />

              <Input
                label="Horário"
                type="time"
                value={modalEvent.eventTime || ""}
                onChange={(e) => modalType !== "view" && setModalEvent((prev) => ({ ...prev, eventTime: e.target.value }))}
                readOnly={modalType === "view"}
              />

              <div className="md:col-span-2 space-y-1">
                <label className="block text-sm font-medium text-foreground">Descrição</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
                  value={modalEvent.description || ""}
                  onChange={(e) => modalType !== "view" && setModalEvent((prev) => ({ ...prev, description: e.target.value }))}
                  readOnly={modalType === "view"}
                  placeholder="Descreva o evento..."
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="block text-sm font-medium text-foreground">Regras</label>
                <textarea
                  rows={4}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
                  value={modalEvent.rules || ""}
                  onChange={(e) => modalType !== "view" && setModalEvent((prev) => ({ ...prev, rules: e.target.value }))}
                  readOnly={modalType === "view"}
                  placeholder="Informe as regras do evento (use Enter para quebrar linhas)..."
                />
              </div>

              <Input
                label="Total de Vagas"
                type="number"
                min="1"
                value={modalEvent.totalSlots === 0 ? "" : (modalEvent.totalSlots ?? "")}
                onChange={(e) => modalType !== "view" && setModalEvent((prev) => ({ ...prev, totalSlots: e.target.value === "" ? "" : Number(e.target.value) }))}
                readOnly={modalType === "view"}
              />

              {modalType !== "create" && (
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-muted-foreground">Participantes Inscritos</label>
                  <div className="px-3 py-2 border border-border rounded-md bg-muted/30 text-foreground text-sm">
                    {modalEvent.participantsCount || 0}
                  </div>
                </div>
              )}

              <Select
                label="Evento Pago?"
                options={[
                  { value: "false", label: "Não" },
                  { value: "true", label: "Sim" },
                ]}
                value={modalEvent.isPaid ? "true" : "false"}
                onChange={(value) =>
                  modalType !== "view" &&
                  setModalEvent((prev) => ({
                    ...prev,
                    isPaid: value === "true",
                    price: value === "true" ? prev.price : 0,
                  }))
                }
                disabled={modalType === "view"}
              />

              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">Preço</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full pl-9 pr-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
                    value={modalEvent.price ?? 0}
                    onChange={(e) => {
                      if (modalType === "view" || !modalEvent.isPaid) return;
                      setModalEvent((prev) => ({ ...prev, price: e.target.value }));
                    }}
                    readOnly={modalType === "view" || !modalEvent.isPaid}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">Status</label>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(computeStatus(modalEvent.eventDate, modalEvent.eventTime, modalEvent.status))}`}>
                  <Icon name={getStatusIcon(computeStatus(modalEvent.eventDate, modalEvent.eventTime, modalEvent.status))} size={12} className="mr-1" />
                  {statusOptions.find((opt) => opt.value === computeStatus(modalEvent.eventDate, modalEvent.eventTime, modalEvent.status))?.label || "—"}
                </span>
                <p className="text-xs text-muted-foreground mt-1">Calculado automaticamente pela data do evento</p>
              </div>

              <div className="md:col-span-2 rounded-xl border border-dashed border-border bg-muted/20 p-4">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={openImagePicker}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openImagePicker();
                    }
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (!saving && modalType !== "view") {
                      setIsImageDragOver(true);
                    }
                  }}
                  onDragLeave={() => setIsImageDragOver(false)}
                  onDrop={handleDropImage}
                  className={`rounded-lg border-2 border-dashed p-6 transition-all ${
                    isImageDragOver ? "border-primary bg-primary/5" : "border-border bg-background"
                  } ${modalType === "view" ? "cursor-default opacity-80" : "cursor-pointer"}`}
                >
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={modalType === "view" || saving}
                    onChange={(event) => applySelectedImages(event?.target?.files)}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <Icon name="ImagePlus" size={22} />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      Arraste imagens aqui ou clique para selecionar
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, WEBP ou GIF • até 2MB por imagem • máximo 10 imagens
                    </p>
                    {modalType !== "view" ? (
                      <Button variant="outline" size="sm" iconName="Upload" className="mt-2">
                        Selecionar Imagens
                      </Button>
                    ) : null}
                  </div>
                </div>
                {eventImagePreviews?.length ? (
                  <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                    {eventImagePreviews.map((preview, index) => (
                      <div key={`${preview}-${index}`} className="relative rounded-md overflow-hidden border border-border bg-background">
                        <img
                          src={preview}
                          alt={`Pré-visualização ${index + 1}`}
                          className="h-20 w-full object-cover"
                        />
                        {modalType !== "view" ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              removeSelectedImage(index);
                            }}
                            className="absolute right-1 top-1 h-5 w-5 rounded-full bg-black/75 text-white flex items-center justify-center hover:bg-black"
                          >
                            <Icon name="X" size={12} />
                          </button>
                        ) : null}
                        <span className="absolute left-1 top-1 text-[10px] px-1.5 py-0.5 rounded bg-black/70 text-white">
                          {index + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center space-x-2 mt-6">
              {modalType !== "view" && (
                <Button variant="default" onClick={handleSaveEvent} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              )}
              <Button variant="outline" onClick={closeModal}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsDataTable;
