class SchedulingService {
    constructor(database) {
        this.dbFunctions = database || require('./db');
    }

    get getDoc() { return this.dbFunctions.getDoc; }
    get setDoc() { return this.dbFunctions.setDoc; }
    get getCollectionRef() { return this.dbFunctions.getCollectionRef; }
    get deleteDoc() { return this.dbFunctions.deleteDoc; }

    async getEvents(businessId) {
        const snap = await this.getCollectionRef('schedule').where('businessId', '==', businessId).get();
        const items = [];
        snap.forEach(d => items.push({ id: d.id, ...d.data() }));
        return items;
    }

    async getEventById(id, businessId) {
        const event = await this.getDoc('schedule', id);
        if (event && businessId && event.businessId !== businessId) {
            throw new Error("Access denied");
        }
        return event;
    }

    async createEvent(businessId, eventData) {
        const id = Date.now().toString();
        const newEvent = {
            id, businessId,
            ...eventData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await this.setDoc('schedule', id, newEvent);

        if (newEvent.isRecurring && newEvent.recurrencePattern) {
            const recurringEvents = this.generateRecurringEvents(newEvent, newEvent.recurrencePattern);
            for (const event of recurringEvents) {
                await this.setDoc('schedule', event.id, event);
            }
        }
        return newEvent;
    }

    async updateEvent(eventId, businessId, updateData) {
        const existing = await this.getEventById(eventId);
        if (!existing) throw new Error("Event not found");
        if (existing.businessId !== businessId) throw new Error("Access denied");

        const updated = {
            ...existing,
            ...updateData,
            id: eventId,
            updatedAt: new Date().toISOString()
        };
        await this.setDoc('schedule', eventId, updated);
        return updated;
    }

    async deleteEvent(eventId, businessId) {
        const event = await this.getEventById(eventId);
        if (!event) throw new Error("Event not found");
        if (event.businessId !== businessId) throw new Error("Access denied");

        await this.deleteDoc('schedule', eventId);

        if (event.isRecurring && !event.parentRecurringId) {
            const snap = await this.getCollectionRef('schedule').where('parentRecurringId', '==', eventId).get();
            const batch = this.getCollectionRef('schedule').firestore.batch();
            snap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
        return true;
    }

    generateRecurringEvents(baseEvent, recurrencePattern) {
        const events = [];
        const startDate = new Date(baseEvent.scheduledDate);
        const endDate = recurrencePattern.endDate ? new Date(recurrencePattern.endDate) : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

        let currentDate = new Date(startDate);
        let occurrenceCount = 0;
        const maxOccurrences = 100;

        while (currentDate <= endDate && occurrenceCount < maxOccurrences) {
            if (occurrenceCount > 0) {
                const newEvent = {
                    ...baseEvent,
                    id: `${baseEvent.id}_${occurrenceCount}`,
                    scheduledDate: currentDate.toISOString().split('T')[0],
                    isRecurring: true,
                    parentRecurringId: baseEvent.id,
                    occurrenceNumber: occurrenceCount
                };
                events.push(newEvent);
            }

            switch (recurrencePattern.frequency) {
                case 'daily': currentDate.setDate(currentDate.getDate() + (recurrencePattern.interval || 1)); break;
                case 'weekly': currentDate.setDate(currentDate.getDate() + 7 * (recurrencePattern.interval || 1)); break;
                case 'monthly': currentDate.setMonth(currentDate.getMonth() + (recurrencePattern.interval || 1)); break;
                default: return events;
            }
            occurrenceCount++;
        }
        return events;
    }
}

module.exports = new SchedulingService();
module.exports.SchedulingService = SchedulingService;
