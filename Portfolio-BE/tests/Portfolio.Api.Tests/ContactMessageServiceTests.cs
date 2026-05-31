using FluentAssertions;
using Portfolio.Application.Features.Contact;
using Xunit;

namespace Portfolio.Api.Tests;

public class ContactMessageServiceTests
{
    [Fact]
    public async Task Create_StoresMessage_AndCountsUnread()
    {
        var db = TestDb.NewContext();
        var service = new ContactMessageService(db);

        var id = await service.CreateAsync("Alice", "alice@example.com", "Hi", "Hello there", CancellationToken.None);

        id.Should().NotBe(Guid.Empty);
        (await service.GetUnreadCountAsync(CancellationToken.None)).Should().Be(1);
        var all = await service.GetAllAsync(CancellationToken.None);
        all.Should().ContainSingle();
        all.Single().Email.Should().Be("alice@example.com");
        all.Single().IsRead.Should().BeFalse();
    }

    [Fact]
    public async Task MarkRead_TogglesReadState()
    {
        var db = TestDb.NewContext();
        var service = new ContactMessageService(db);
        var id = await service.CreateAsync("Bob", "bob@example.com", null, "Question", CancellationToken.None);

        var ok = await service.MarkReadAsync(id, true, CancellationToken.None);

        ok.Should().BeTrue();
        (await service.GetUnreadCountAsync(CancellationToken.None)).Should().Be(0);
    }

    [Fact]
    public async Task Delete_RemovesMessage()
    {
        var db = TestDb.NewContext();
        var service = new ContactMessageService(db);
        var id = await service.CreateAsync("Cara", "cara@example.com", null, "Bye", CancellationToken.None);

        (await service.DeleteAsync(id, CancellationToken.None)).Should().BeTrue();
        (await service.GetAllAsync(CancellationToken.None)).Should().BeEmpty();
        (await service.DeleteAsync(Guid.NewGuid(), CancellationToken.None)).Should().BeFalse();
    }

    [Theory]
    [InlineData("", "e@e.com", "msg")]
    [InlineData("name", "", "msg")]
    [InlineData("name", "e@e.com", "")]
    public async Task Create_WithMissingFields_Throws(string name, string email, string message)
    {
        var db = TestDb.NewContext();
        var service = new ContactMessageService(db);
        var act = async () => await service.CreateAsync(name, email, null, message, CancellationToken.None);
        await act.Should().ThrowAsync<ArgumentException>();
    }
}
