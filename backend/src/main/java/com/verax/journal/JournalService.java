package com.verax.journal;

import com.verax.user.User;
import com.verax.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class JournalService {

    private final JournalRepository journal;
    private final UserRepository users;

    public JournalService(JournalRepository journal, UserRepository users) {
        this.journal = journal;
        this.users = users;
    }

    public List<JournalDtos.Response> list(UUID userId, LocalDate from, LocalDate to) {
        return journal.findByUserIdAndDateBetweenOrderByDateDesc(userId, from, to).stream()
                .map(JournalDtos.Response::from)
                .toList();
    }

    public JournalDtos.Response get(UUID userId, LocalDate date) {
        return journal.findByUserIdAndDate(userId, date)
                .map(JournalDtos.Response::from)
                .orElse(new JournalDtos.Response(null, date, null, null, null, null, null, null, null));
    }

    @Transactional
    public JournalDtos.Response upsert(UUID userId, LocalDate date, JournalDtos.Upsert request) {
        User user = users.getReferenceById(userId);
        JournalEntry entry = journal.findByUserIdAndDate(userId, date).orElseGet(() -> {
            JournalEntry created = new JournalEntry();
            created.setUser(user);
            created.setDate(date);
            return created;
        });
        if (request.content() != null) {
            entry.setContent(request.content());
        }
        if (request.mood() != null) {
            entry.setMood(request.mood());
        }
        if (request.reflection() != null) {
            entry.setReflection(request.reflection());
        }
        if (request.wins() != null) {
            entry.setWins(request.wins());
        }
        if (request.problems() != null) {
            entry.setProblems(request.problems());
        }
        if (request.lessons() != null) {
            entry.setLessons(request.lessons());
        }
        journal.save(entry);
        return JournalDtos.Response.from(entry);
    }
}
