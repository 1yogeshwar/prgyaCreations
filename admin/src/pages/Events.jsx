import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import Loader from "../components/Loader";
import "./Events.css";

const API = process.env.REACT_APP_API_URL;

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("admin-token")}`,
});

const empty = {
  title: "",
  description: "",
  location: "",
  date: "",
  image: "",
  tag: "exhibition",
  isPublished: true,
};

export default function Events() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // ==========================================
  // LOAD EVENTS
  // ==========================================

  const load = async ({ showLoader = false } = {}) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const response = await axios.get(`${API}/events`);

      setEvents(response.data);
    } catch (error) {
      console.error("Events load error:", error);

      toast.error(
        error.response?.data?.message ||
          "Unable to load events"
      );
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    load({ showLoader: true });
  }, []);

  // ==========================================
  // CREATE / UPDATE EVENT
  // ==========================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) {
      return;
    }

    try {
      setSaving(true);

      if (editing) {
        await axios.put(
          `${API}/events/${editing}`,
          form,
          {
            headers: authHeader(),
          }
        );

        toast.success("Event updated!");
      } else {
        await axios.post(
          `${API}/events`,
          form,
          {
            headers: authHeader(),
          }
        );

        toast.success("Event created!");
      }

      setForm(empty);
      setEditing(null);
      setShowForm(false);

      // Silent refresh
      await load();
    } catch (error) {
      console.error("Event save error:", error);

      toast.error(
        error.response?.data?.message ||
          "Error saving event"
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // EDIT EVENT
  // ==========================================

  const handleEdit = (eventItem) => {
    setForm({
      title: eventItem.title || "",
      description: eventItem.description || "",
      location: eventItem.location || "",
      date: eventItem.date?.slice(0, 10) || "",
      image: eventItem.image || "",
      tag: eventItem.tag || "exhibition",
      isPublished: eventItem.isPublished,
    });

    setEditing(eventItem._id);
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ==========================================
  // DELETE EVENT
  // ==========================================

  const handleDelete = async (id) => {
    if (deletingId) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this event?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(id);

      await axios.delete(
        `${API}/events/${id}`,
        {
          headers: authHeader(),
        }
      );

      toast.success("Deleted!");

      await load();
    } catch (error) {
      console.error("Event delete error:", error);

      toast.error(
        error.response?.data?.message ||
          "Error deleting event"
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ==========================================
  // ADD / CANCEL FORM
  // ==========================================

  const toggleForm = () => {
    if (saving) {
      return;
    }

    if (showForm) {
      setShowForm(false);
      setForm(empty);
      setEditing(null);
      return;
    }

    setForm(empty);
    setEditing(null);
    setShowForm(true);
  };

  const cancelEdit = () => {
    if (saving) {
      return;
    }

    setForm(empty);
    setEditing(null);
    setShowForm(false);
  };

  return (
    <div className="admin-page events-page">
      {/* =====================================
          HEADER
          ===================================== */}

      <div className="events-page-heading">
        <h2 className="admin-page-title">
          Events & Fairs
        </h2>

        <button
          type="button"
          onClick={toggleForm}
          disabled={saving}
          className="event-main-action"
        >
          <span className="event-main-action__fold" />

          <span className="event-main-action__inner">
            <span className="event-main-action__icon">
              {showForm ? "×" : "✦"}
            </span>

            <span>
              {showForm
                ? "Cancel"
                : "Add Event"}
            </span>
          </span>

          <span className="event-main-action__points">
            <span className="event-main-action__point event-main-action__point--1" />
            <span className="event-main-action__point event-main-action__point--2" />
            <span className="event-main-action__point event-main-action__point--3" />
          </span>
        </button>
      </div>

      {/* =====================================
          FORM
          ===================================== */}

      {showForm && (
        <form
          className="events-form"
          onSubmit={handleSubmit}
        >
          {/* TITLE */}

          <div className="events-form-field">
            <label>
              Title
            </label>

            <input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Event title"
              required
              disabled={saving}
            />
          </div>

          {/* LOCATION */}

          <div className="events-form-field">
            <label>
              Location
            </label>

            <input
              value={form.location}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  location: event.target.value,
                }))
              }
              placeholder="Location"
              required
              disabled={saving}
            />
          </div>

          {/* IMAGE */}

          <div className="events-form-field">
            <label>
              Image URL
            </label>

            <input
              value={form.image}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  image: event.target.value,
                }))
              }
              placeholder="https://..."
              disabled={saving}
            />
          </div>

          {/* DATE */}

          <div className="events-form-field">
            <label>
              Date
            </label>

            <input
              type="date"
              value={form.date}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  date: event.target.value,
                }))
              }
              required
              disabled={saving}
            />
          </div>

          {/* TAG */}

          <div className="events-form-field">
            <label>
              Tag
            </label>

            <select
              value={form.tag}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  tag: event.target.value,
                }))
              }
              disabled={saving}
            >
              {[
                "exhibition",
                "pop-up",
                "market",
                "festival",
              ].map((tag) => (
                <option
                  key={tag}
                  value={tag}
                >
                  {tag}
                </option>
              ))}
            </select>
          </div>

          {/* DESCRIPTION */}

          <div className="events-form-field events-form-field--wide">
            <label>
              Description
            </label>

            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description:
                    event.target.value,
                }))
              }
              required
              disabled={saving}
            />
          </div>

          {/* PUBLISHED */}

          <div className="events-published events-form-field--wide">
            <input
              id="event-published"
              type="checkbox"
              checked={form.isPublished}
              disabled={saving}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isPublished:
                    event.target.checked,
                }))
              }
            />

            <label htmlFor="event-published">
              Published (visible on site)
            </label>
          </div>

          {/* ACTIONS */}

          <div className="events-form-actions events-form-field--wide">
            <button
              type="submit"
              disabled={saving}
              className="event-save-button"
            >
              {saving ? (
                <>
                  <Loader type="button" />

                  {editing
                    ? "Updating..."
                    : "Creating..."}
                </>
              ) : (
                <>
                  <span className="event-save-button__icon">
                    ✎
                  </span>

                  {editing
                    ? "Update Event"
                    : "Create Event"}
                </>
              )}
            </button>

            {editing && (
              <button
                type="button"
                disabled={saving}
                onClick={cancelEdit}
                className="event-cancel-button"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      )}

      {/* =====================================
          LOADING
          ===================================== */}

      {loading ? (
        <Loader type="heart" />
      ) : (
        <div className="events-card-grid">
          {events.map((eventItem) => (
            <article
              key={eventItem._id}
              className="event-card"
            >
              {/* IMAGE */}

              {eventItem.image && (
                <img
                  src={eventItem.image}
                  alt={eventItem.title}
                  className="event-card__image"
                />
              )}

              <div className="event-card__body">
                {/* META */}

                <div className="event-card__top">
                  <span className="event-card__tag">
                    {eventItem.tag}
                  </span>

                  {!eventItem.isPublished && (
                    <span className="event-card__draft">
                      Draft
                    </span>
                  )}
                </div>

                {/* TITLE */}

                <h3 className="event-card__title">
                  {eventItem.title}
                </h3>

                {/* LOCATION */}

                <p className="event-card__meta">
                  📍 {eventItem.location}
                </p>

                {/* DATE */}

                <p className="event-card__meta event-card__date">
                  📅{" "}
                  {new Date(
                    eventItem.date
                  ).toLocaleDateString(
                    "en-IN",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }
                  )}
                </p>

                {/* DESCRIPTION */}

                <p className="event-card__description">
                  {eventItem.description
                    ?.length > 100
                    ? `${eventItem.description.slice(
                        0,
                        100
                      )}...`
                    : eventItem.description}
                </p>

                {/* ACTIONS */}

                <div className="event-card__actions">
                  <button
                    type="button"
                    onClick={() =>
                      handleEdit(eventItem)
                    }
                    disabled={
                      deletingId ===
                      eventItem._id
                    }
                    className="event-edit-button"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDelete(
                        eventItem._id
                      )
                    }
                    disabled={
                      deletingId !== null
                    }
                    className="event-delete-button"
                  >
                    {deletingId ===
                    eventItem._id ? (
                      <>
                        <Loader type="button" />
                        Deleting...
                      </>
                    ) : (
                      "Delete"
                    )}
                  </button>
                </div>
              </div>
            </article>
          ))}

          {events.length === 0 && (
            <div className="events-empty">
              No events yet — add your first event!
            </div>
          )}
        </div>
      )}
    </div>
  );
}