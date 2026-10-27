package net.voldrich.myhome.backend.learning.internal.service;

import net.voldrich.myhome.backend.auth.FamilyMemberRemovedEvent;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Service;

@Service
public class LearningEventListener {

    private final LearningService learningService;

    public LearningEventListener(LearningService learningService) {
        this.learningService = learningService;
    }

    @ApplicationModuleListener
    public void on(FamilyMemberRemovedEvent event) {
        learningService.deleteMemberData(event.familyId(), event.userId());
    }
}
